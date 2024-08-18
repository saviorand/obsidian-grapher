import sys
import os
import traceback
import pylibmagic
from unstructured.partition.auto import partition

def file_to_text(file_path, txt_path):
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file not found: {file_path}")

        os.makedirs(os.path.dirname(txt_path), exist_ok=True)

        elements = partition(filename=file_path)
        with open(txt_path, 'w') as f:
            for el in elements:
                f.write(str(el))
                f.write("\n")
        print(f"Successfully converted {file_path} to {txt_path}")
    except Exception as e:
        print(f"Error in file_to_text function: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)

if __name__ == "__main__":
    try:
        if len(sys.argv) < 3:
            print("Usage: python file_to_text.py input_file output_txt")
            sys.exit(1)

        file_path = sys.argv[1]
        txt_path = sys.argv[2]

        print(f"Input file: {file_path}")
        print(f"Output file: {txt_path}")

        file_to_text(file_path, txt_path)
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        print(traceback.format_exc())
        sys.exit(1)
