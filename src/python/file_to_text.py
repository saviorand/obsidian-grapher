import sys
import pylibmagic
from unstructured.partition.auto import partition

def file_to_text(file_path, txt_path):
    elements = partition(filename=file_path)
    with open(txt_path, 'w') as f:
        for el in elements:
            f.write(str(el))
            f.write("\n")

if len(sys.argv) < 3:
    print("Usage: python file_to_text.py input_file output_txt")
    sys.exit(1)

file_path = sys.argv[1]
txt_path = sys.argv[2]

file_to_text(file_path, txt_path)