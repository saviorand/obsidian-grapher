import sys
from utils import parse_prolog_predicates, call_gpt_api, relation_correctness_check, file_to_chunks, text_to_relations, prolog_predicates_to_entities, entities_to_categorized_entities
from prompts import relation_prompt, categories_prompt, correctness_check_prompt, arity_two_prompt

if len(sys.argv) < 3:
    print("Usage: python text_to_prolog.py input_file output_file domain_subjects")
    sys.exit(1)

input_file = sys.argv[1] # e.g. 'nieo.txt'
output_file = sys.argv[2] # e.g. 'nieo.pl'
# domain_subjects = sys.argv[3] # e.g. 'NIEO, international relations, economics'
output_file_noext = output_file.split('.')[0]

original_text_chunk_size = 2000
original_text_chunks = file_to_chunks(input_file, original_text_chunk_size)

relation_output_file = f'{output_file_noext}.pl'
# entities_output_file = f'{output_file_noext}_entities.pl'
# categories_output_file = f'{output_file_noext}_categories.pl'

output_relations = text_to_relations(original_text_chunks, relation_output_file, arity_two_prompt, correctness_check_prompt())

# entity_predicates = parse_prolog_predicates(output_relations)

# prolog_predicates_to_entities(entity_predicates, entities_output_file)

# entities_chunk_size = 2000
# entities_chunks = file_to_chunks(entities_output_file, entities_chunk_size)

# entities_to_categorized_entities(entities_chunks, categories_output_file, categories_prompt)