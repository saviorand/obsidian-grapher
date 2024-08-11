import * as fs from 'fs';

function fileToChunks(inputFile: string, chunkSize: number): string[] {
    // Read the file synchronously
    const text: string = fs.readFileSync(inputFile, 'utf-8');
    
    // Split the text into chunks
    return chunkText(text, chunkSize);
}

function chunkText(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    let currentChunk = '';

    // Split the text into words
    const words = text.split(/\s+/);

    for (const word of words) {
        if ((currentChunk + ' ' + word).length <= chunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + word;
        } else {
            if (currentChunk) {
                chunks.push(currentChunk);
            }
            currentChunk = word;
        }
    }

    // Add the last chunk if it's not empty
    if (currentChunk) {
        chunks.push(currentChunk);
    }

    return chunks;
}

export { fileToChunks, chunkText };