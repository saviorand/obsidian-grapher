import sys
import os
from utils import parse_prolog_file

def create_folders_and_files(arity_1_predicates, arity_2_predicates, output_dir):
    os.makedirs(output_dir, exist_ok=True)

    # Create folders and files for arity 1 predicates
    for predicate, parameters in arity_1_predicates.items():
        predicate_dir = os.path.join(output_dir, predicate)
        os.makedirs(predicate_dir, exist_ok=True)
        pred_file_path = os.path.join(predicate_dir, f"{predicate}.md")
        with open(pred_file_path, 'a') as file:
            file.write("%% Waypoint ")
            file.write("%% \n")

        for parameter in parameters:
            file_path = os.path.join(predicate_dir, f"{parameter}.md")
            with open(file_path, 'w') as file:
                file.write(f"# {parameter}\n\n")

    # Add arity 2 predicates as links
    for predicate, param1, param2 in arity_2_predicates:
        # Find which arity 1 predicate contains param1
        for arity_1_pred, params in arity_1_predicates.items():
            if param1 in params:
                param_file_path = os.path.join(output_dir, arity_1_pred, f"{param1}.md")
                with open(param_file_path, 'a') as file:
                    file.write(f"{predicate}::[[{param2}]]\n")
                break
        else:
            uncategorized_dir = os.path.join(output_dir, "uncategorized")
            print(f"Warning: No matching arity 1 predicate found for {param1} in {predicate}({param1}, {param2}). Saving in {uncategorized_dir}")
            os.makedirs(uncategorized_dir, exist_ok=True)
            param_file_path = os.path.join(uncategorized_dir, f"{param1}.md")
            with open(param_file_path, 'a') as file:
                file.write(f"{predicate}::[[{param2}]]\n")

    print("Folders and files created successfully!")

def main():
    if len(sys.argv) < 2:
        print("Usage: python prolog_to_folder.py input_file output_dir")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_dir = sys.argv[2]
    
    arity_1_predicates, arity_2_predicates = parse_prolog_file(input_file)
    create_folders_and_files(arity_1_predicates, arity_2_predicates, output_dir)

    print("Folders and files created successfully!")

if __name__ == "__main__":
    main()
