import os
from langgraph.graph import StateGraph, START, END
from langchain_anthropic import ChatAnthropic
from langchain.messages import AnyMessage, SystemMessage, AIMessage, HumanMessage, ToolMessage
from langchain.tools import tool
import operator
from typing import TypedDict, Annotated
from fastapi import FastAPI
from pydantic import BaseModel
from dotenv import load_dotenv
from proteins import *

load_dotenv()
app = FastAPI()
model = ChatAnthropic(model="claude-sonnet-4-5-20250929")

class MessageState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    llm_calls: int

@tool
def protein_getter(query):
    "Retrieve information about a certain protein such a structures information and mutations."
    protein = ProteinService().search(query)
    protein_info = protein.uniprot["primaryAccession"]
    structures = []
    mutations = []

    for s in protein.structures:
        structures.append(s)

    for m in protein.mutations:
        mutations.append(m)

    return {
        "protein": {
            "accession": protein.uniprot["primaryAccession"],
            "name": protein.uniprot["proteinDescription"]["recommendedName"]["fullName"]["value"],
            "sequence": protein.uniprot["sequence"]["value"],
            "length": protein.uniprot["sequence"]["length"],
        },
        "structures": structures,
        "mutations": mutations,
    }

tools = [protein_getter]
model_tools = model.bind_tools(tools)

tools_by_name = {tool.name: tool for tool in tools}


def ask_model_with_tools(state):
    response = model_tools.invoke(
        [
            SystemMessage(content="You are a helpful assistant."),
        ] + state["messages"]
    )
    return {
        "messages": [response],
        "llm_calls": state.get("llm_calls", 0) + 1
    }

def tool_call(state: dict):
    result = []
    for tool_call in state["messages"][-1].tool_calls:
        tool = tools_by_name[tool_call["name"]]
        observation = tool.invoke(tool_call["args"])
        result.append(ToolMessage(content=observation, tool_call_id=tool_call["id"]))
    return {
        "messages":  result
    }

def should_continue(state: dict):
    messages = state["messages"]
    last_message = messages[-1]

    if last_message.tool_calls:
        return "tool_node"
    
    return END

agent_graph = StateGraph(MessageState)
agent_graph.add_node("llm_call", ask_model_with_tools)
agent_graph.add_node("tool_node", tool_call)

agent_graph.add_edge(START, "llm_call")
agent_graph.add_conditional_edges("llm_call", should_continue, ["tool_node", END])
agent_graph.add_edge("tool_node", "llm_call")
agent = agent_graph.compile()

messages = []

question = "tell me about apples earnings"
messages.append(HumanMessage(content=question))
state = {"messages": messages}
response = agent.invoke(state)
print(response["messages"][-1].content)