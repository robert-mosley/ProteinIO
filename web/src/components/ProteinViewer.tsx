import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { Color } from 'molstar/lib/mol-util/color'
import 'molstar/build/viewer/molstar.css'
import { StructureElement } from 'molstar/lib/mol-model/structure'
import { Loci } from 'molstar/lib/mol-model/loci'
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder'

type PluginContext = Awaited<ReturnType<typeof createPluginUI>>

type Highlight = { chain: string; residue: number }

type ProteinViewerProps = {
  pdbUrl?: string
  pdbText?: string
  highlight?: Highlight
}

export type ProteinViewerHandle = {
  /** Highlight a residue by chain + auth_seq_id. Call this any time after the structure is loaded. */
  highlightResidue: (chain: string, residue: number) => void
  /** Clear the current highlight. */
  clearHighlight: () => void
}

async function loadStructureFromText(plugin: PluginContext, pdbText: string) {
  try {
    await plugin.clear()

    const data = await plugin.builders.data.rawData({
      data: pdbText,
      label: 'Generated Protein',
    })

    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb')

    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default')

    console.log('Loaded PDB from text')
  } catch (err) {
    console.error(err)
  }
}

async function loadStructure(plugin: PluginContext, url: string) {
  try {
    await plugin.clear()

    const data = await plugin.builders.data.download(
      { url, isBinary: false },
      { state: { isGhost: true } }
    )

    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb')
    console.log('Parsed')

    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default')
    console.log('Applied')
  } catch (e) {
    console.error(e)
  }
}

/**
 * Finds a residue by chain + auth_seq_id and highlights it with:
 *  - a persistent selection (survives mouse movement)
 *  - a dedicated ball-and-stick component in a bright color, so it's visible
 *    even under a cartoon representation
 *  - a camera focus on the residue
 *
 * Searches across all units (not just units[0]) since chains can be split
 * across multiple units in mol-model's data model.
 *
 * IMPORTANT: the MolScript query below uses `chainTest` (NOT `unitTest` —
 * that's not a real atomGroups parameter, and using it silently drops the
 * chain filter, which previously caused the query to match nearly the whole
 * structure instead of one residue).
 */
async function highlightResidue(plugin: PluginContext, chain: string, residueNumber: number) {
  if (!Number.isFinite(residueNumber)) {
    console.warn(
      `highlightResidue: residue must be a number (got ${JSON.stringify(residueNumber)}) — ` +
        `this usually means the caller passed an amino-acid code (e.g. "ALA") instead of a sequence position`
    )
    return
  }

  const structureCell = plugin.managers.structure.hierarchy.current.structures[0]?.cell
  const structure = structureCell?.obj?.data
  if (!structureCell || !structure) {
    console.warn('highlightResidue: no structure loaded yet')
    return
  }

  console.log('highlightResidue: requested', { chain, residueNumber })

  // Locate the exact atoms for this residue by walking the structure directly
  // (precise — avoids relying solely on a MolScript query that could over-match).
  let matchedUnit: (typeof structure.units)[number] | null = null
  let matchedIndices: number[] = []

  for (const unit of structure.units) {
    const { atomicHierarchy } = unit.model
    const positions: number[] = []

    // IMPORTANT: iterate by array position (i), not by the element values
    // themselves. StructureElement.Loci expects `indices` to be positions
    // *within* unit.elements (0, 1, 2, ...), not the raw global atom index
    // values that unit.elements holds. Passing the raw values in as if they
    // were positions silently points the loci at the wrong atoms (usually
    // out of the intended residue, or out of bounds) — which is what was
    // causing the camera to focus on the wrong, "empty" location even
    // though the separately-built ball-and-stick component (unaffected by
    // this bug) rendered in the correct place.
    for (let i = 0; i < unit.elements.length; i++) {
      const e = unit.elements[i]
      const residueIdx = atomicHierarchy.residueAtomSegments.index[e]
      const seqId = atomicHierarchy.residues.auth_seq_id.value(residueIdx)

      const chainIdx = atomicHierarchy.chainAtomSegments.index[e]
      const chainId = atomicHierarchy.chains.auth_asym_id.value(chainIdx)

      if (seqId === residueNumber && chainId === chain) {
        positions.push(i)
      }
    }

    if (positions.length > 0) {
      matchedUnit = unit
      matchedIndices = positions
      break
    }
  }

  if (!matchedUnit || matchedIndices.length === 0) {
    console.warn(`highlightResidue: chain "${chain}" residue ${residueNumber} not found`)
    return
  }

  console.log('highlightResidue: found', matchedIndices.length, 'atoms')

  let loci: StructureElement.Loci
  try {
    loci = StructureElement.Loci(structure, [{ unit: matchedUnit, indices: matchedIndices }])
  } catch (err) {
    console.error('highlightResidue: StructureElement.Loci threw', err)
    return
  }

  if (Loci.isEmpty(loci)) {
    console.warn(`highlightResidue: resolved loci is empty for chain "${chain}" residue ${residueNumber}`)
    return
  }

  // Persistent selection (survives mouse movement). This alone is enough to
  // visually mark the residue as selected — isolated in its own try/catch so
  // a failure here can't block the camera focus or ball-and-stick component.
  try {
    plugin.managers.interactivity.lociSelects.select({ loci })
  } catch (err) {
    console.error('highlightResidue: lociSelects.select failed', err)
  }

  // NOTE: intentionally NOT calling plugin.managers.interactivity.lociHighlights.highlight(loci)
  // here. That transient hover-style highlight call crashes inside mol-star's
  // internal LociLabelManager (a bug in one of the built-in representations'
  // label providers, e.g. accessible-surface-area — not something fixable on
  // our end). The persistent selection above plus the ball-and-stick
  // component below are sufficient to visibly mark the residue.

  try {
    // A precise chain+residue MolScript expression (NOT a broad query) so the
    // ball-and-stick component only ever covers this one residue.
    const queryExpression = MS.struct.generator.atomGroups({
      chainTest: MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_asym_id(), chain]),
      residueTest: MS.core.rel.eq([MS.struct.atomProperty.macromolecular.auth_seq_id(), residueNumber]),
    })

    const component = await plugin.builders.structure.tryCreateComponentFromExpression(
      structureCell,
      queryExpression,
      `highlight-${chain}-${residueNumber}`,
      { label: `Highlight ${chain}${residueNumber}` }
    )

    if (component) {
      await plugin.builders.structure.representation.addRepresentation(component, {
        type: 'ball-and-stick',
        color: 'uniform',
        colorParams: { value: Color(0xffcc00) },
        size: 'uniform',
        sizeParams: { value: 0.45 },
      })
      console.log('highlightResidue: created ball-and-stick component for', chain, residueNumber)
    }
  } catch (err) {
    console.error('highlightResidue: error creating ball-and-stick component', err)
  }

  // Focus the camera LAST, after the component exists, and with a minimum
  // radius — a single residue (a handful of atoms) has a tiny bounding
  // sphere on its own, and focusing tightly on it puts the camera so close
  // that nothing is left in the view frustum (looks "blank").
  try {
    plugin.managers.camera.focusLoci(loci, { minRadius: 8, extraRadius: 4 })
  } catch (err) {
    console.error('highlightResidue: camera.focusLoci failed', err)
  }
}

const ProteinViewer = forwardRef<ProteinViewerHandle, ProteinViewerProps>(function ProteinViewer(
  { pdbUrl, pdbText, highlight },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginContext | null>(null)
  const [pluginReady, setPluginReady] = useState(false)
  // Increments only once a structure has actually finished loading into the
  // plugin. Highlighting must wait on this, not just on pluginReady, or it
  // can fire against a structure that's still mid-load / not yet built.
  const [structureVersion, setStructureVersion] = useState(0)

  // One-command imperative API: viewerRef.current.highlightResidue('A', 42)
  useImperativeHandle(
    ref,
    () => ({
      highlightResidue: (chain: string, residue: number) => {
        const plugin = pluginRef.current
        if (!plugin) {
          console.warn('highlightResidue: viewer not initialized yet')
          return
        }
        highlightResidue(plugin, chain, residue).catch((err) =>
          console.error('highlightResidue failed', err)
        )
      },
      clearHighlight: () => {
        const plugin = pluginRef.current
        if (!plugin) return
        try {
          plugin.managers.interactivity.lociHighlights.clearHighlights()
        } catch (err) {
          console.error('clearHighlight: lociHighlights.clearHighlights failed', err)
        }
        try {
          plugin.managers.interactivity.lociSelects.deselectAll()
        } catch (err) {
          console.error('clearHighlight: lociSelects.deselectAll failed', err)
        }
      },
    }),
    []
  )

  // When pdbUrl/pdbText change (or the plugin becomes ready), load the structure.
  useEffect(() => {
    const plugin = pluginRef.current
    if (!plugin || !pluginReady) return

    let cancelled = false

    ;(async () => {
      console.log('ProteinViewer: loading structure', { pdbUrl, pdbText })
      if (pdbText) {
        await loadStructureFromText(plugin, pdbText)
      } else if (pdbUrl) {
        await loadStructure(plugin, pdbUrl)
      }

      if (cancelled) return
      // Signal that a structure now exists and is safe to highlight against.
      setStructureVersion((v) => v + 1)
    })()

    return () => {
      cancelled = true
    }
  }, [pdbUrl, pdbText, pluginReady])

  // When the `highlight` prop changes, apply or clear it — but only once a
  // structure has actually finished loading (structureVersion > 0). This is
  // what prevents highlighting from racing an in-flight structure load, and
  // is what makes setHighlight(...) alone (e.g. from the AI assistant)
  // actually highlight something.
  useEffect(() => {
    const plugin = pluginRef.current
    if (!plugin || !pluginReady || structureVersion === 0) return

    if (highlight) {
      console.log('ProteinViewer: applying highlight prop', highlight)
      highlightResidue(plugin, highlight.chain, highlight.residue).catch((err) =>
        console.error('highlightResidue failed', err)
      )
    } else {
      try {
        plugin.managers.interactivity.lociHighlights.clearHighlights()
      } catch (err) {
        console.error('ProteinViewer: lociHighlights.clearHighlights failed', err)
      }
      try {
        plugin.managers.interactivity.lociSelects.deselectAll()
      } catch (err) {
        console.error('ProteinViewer: lociSelects.deselectAll failed', err)
      }
    }
  }, [highlight, pluginReady, structureVersion])

  // Initialize plugin once on mount
  useEffect(() => {
    if (!containerRef.current) return
    let disposed = false

    async function init() {
      const plugin = await createPluginUI({
        target: containerRef.current!,
        render: renderReact18,
        spec: {
          ...DefaultPluginUISpec(),
          layout: {
            initial: {
              isExpanded: false,
              showControls: false,
            },
          },
          components: {
            remoteState: 'none',
          },
          canvas3d: {
            renderer: {
              backgroundColor: Color(0x0a1220),
            },
          },
        },
      })

      if (disposed) {
        plugin.dispose()
        return
      }

      pluginRef.current = plugin
      setPluginReady(true)
    }

    init().catch(console.error)

    return () => {
      disposed = true
      setPluginReady(false)
      pluginRef.current?.dispose()
      pluginRef.current = null
    }
  }, [])

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />
})

export default ProteinViewer