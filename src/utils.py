import os
import re
from textwrap import wrap
from openai import OpenAI
from dotenv import load_dotenv
import anthropic

load_dotenv()

claude_client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
)
gpt_client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY"),
)

def file_to_chunks(input_file, chunk_size):
    """Split the input text file into chunks of specified size."""
    with open(input_file, 'r') as f:
        text = f.read()
    
    return wrap(text, chunk_size, break_long_words=False)

def call_gpt_api(chunk, prompt):
    """Call the GPT API with the given chunk and prompt."""
    try:
        response = gpt_client.chat.completions.create(
        messages=[
        {
            "role": "system",
            "content": prompt
        },
        {
            "role": "user",
            "content": chunk
        }
        ],
        model="gpt-4o-mini",
        )
        return response.choices[0].message.content
    except Exception as e:
        return f"Error: {str(e)}"

def call_claude_api(chunk, prompt):
    try:
        message = claude_client.messages.create(
            system=prompt,
            model="claude-3-5-sonnet-20240620",
            max_tokens=len(chunk),
            temperature=0,
            messages=[
                {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": chunk
                    }
                ]
                }
            ]
        )
        return message.content[0].text
    except Exception as e:
        return f"Error: {str(e)}"


def relation_correctness_check(text, prolog_code, prompt):
    correctness_check_prompt = f'''{prompt}

    Prolog Code:
    {prolog_code}

    Original Text:'''

    # return call_gpt_api(text, correctness_check_prompt)
    return call_claude_api(text, correctness_check_prompt)

def text_to_relations(chunks, output_file, prompt, correctness_check_prompt):
    """Extract relations from a list of chunks and save to output file."""
    complete_output = ""
    with open(output_file, 'w') as f:
        for i, chunk in enumerate(chunks):
            print(f"Processing relations chunk {i+1}/{len(chunks)}")
            # preliminary_result = call_gpt_api(chunk, prompt)
            preliminary_result = call_claude_api(chunk, prompt)
            # result = relation_correctness_check(chunk, preliminary_result, correctness_check_prompt)
            f.write(f"% Chunk {i+1}\n{preliminary_result}\n\n")
            complete_output += preliminary_result + "\n"
    
    return complete_output

def prolog_predicates_to_entities(predicates, output_file):
    """Convert a list of Prolog predicates to entities and save to output file."""
    entity_predicates_arity_1 = predicates[0]
    entity_predicates_arity_2 = predicates[1]

    entity_list = []

    for predicate, parameters in entity_predicates_arity_1.items():
        for parameter in parameters:
            entity_list.append(parameter)

    for predicate, param1, param2 in entity_predicates_arity_2:
        entity_list.append(param1)
        entity_list.append(param2)

    entity_list = list(set(entity_list)) # Remove duplicates
    
    with open(output_file, 'w') as f:
        for entity in entity_list:
            f.write(f"{entity}.\n")

def entities_to_categorized_entities(chunks, output_file, prompt):
    """Categorize a list of entities using Prolog predicates and save to output file."""
    complete_output = ""
    with open(output_file, 'w') as f:
        for i, chunk in enumerate(chunks):
            print(f"Processing entities chunk {i+1}/{len(chunks)}")
            result = call_gpt_api(chunk, prompt)
            f.write(f"% Chunk {i+1}\n{result}\n\n")
            complete_output += result + "\n"
    
    return complete_output

def parse_prolog_file(file_path):
    content = read_file(file_path)
    return parse_prolog_predicates(content)

def parse_prolog_predicates(content):
    arity_1_predicates = {}
    arity_2_predicates = []
    
    # Parse arity 2 predicates
    arity_2_pattern = r"(\w+)\((?:'([^']+)'|(\w+))\s*,\s*(?:'([^']+)'|(\w+))\)\."
    for match in re.finditer(arity_2_pattern, content):
        predicate, quoted_param1, unquoted_param1, quoted_param2, unquoted_param2 = match.groups()
        param1 = quoted_param1 or unquoted_param1
        param2 = quoted_param2 or unquoted_param2
        arity_2_predicates.append((predicate, param1, param2))

    # Parse arity 1 predicates
    arity_1_pattern = r"(\w+)\((?:'([^']+)'|(\w+))\)\."
    for match in re.finditer(arity_1_pattern, content):
        predicate, quoted_param, unquoted_param = match.groups()
        parameter = quoted_param or unquoted_param
        if predicate not in arity_1_predicates:
            arity_1_predicates[predicate] = set()
        arity_1_predicates[predicate].add(parameter)

    return arity_1_predicates, arity_2_predicates

def read_file(file_path):
    with open(file_path, 'r') as file:
        return file.read()