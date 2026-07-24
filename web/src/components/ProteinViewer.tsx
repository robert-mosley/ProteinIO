import React, { useEffect, useRef } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { Color } from 'molstar/lib/mol-util/color'
import 'molstar/build/viewer/molstar.css'

type PluginContext = Awaited<ReturnType<typeof createPluginUI>>

async function loadStructure(plugin: PluginContext, url: string) {
  try {
    await plugin.clear()
    const data = await plugin.builders.data.download(
      { url, isBinary: false },
      { state: { isGhost: true } }
    )
    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'pdb')
    await plugin.builders.structure.hierarchy.applyPreset(trajectory, 'default')
  } catch (e) {
    console.error('[ProteinViewer] Failed to load structure:', e)
  }
}

export default function ProteinViewer({ pdbUrl }: { pdbUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pluginRef = useRef<PluginContext | null>(null)
  // Track the latest requested URL so init() always loads the most recent one
  const pendingUrlRef = useRef<string>(pdbUrl)

  // When pdbUrl changes, update the ref and reload if plugin is already ready
  useEffect(() => {
    pendingUrlRef.current = pdbUrl
    if (pluginRef.current) {
      loadStructure(pluginRef.current, pdbUrl)
    }
  }, [pdbUrl])

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
      // Load whichever URL is current at this moment (may have changed during init)
      await loadStructure(plugin, pendingUrlRef.current)
    }

    init().catch(console.error)

    return () => {
      disposed = true
      pluginRef.current?.dispose()
      pluginRef.current = null
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    />
  )
}
