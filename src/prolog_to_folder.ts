import * as fs from 'fs';
import * as path from 'path';

interface Arity1Predicates {
    [key: string]: Set<string>;
}

type Arity2Predicate = [string, string, string];

function createFoldersAndFiles(
    arity1Predicates: Arity1Predicates,
    arity2Predicates: Arity2Predicate[],
    outputDir: string
): void {
    fs.mkdirSync(outputDir, { recursive: true });

    // Create folders and files for arity 1 predicates
    for (const [predicate, parameters] of Object.entries(arity1Predicates)) {
        const predicateDir = path.join(outputDir, predicate);
        fs.mkdirSync(predicateDir, { recursive: true });
        const predFilePath = path.join(predicateDir, `${predicate}.md`);
        fs.appendFileSync(predFilePath, "%% Waypoint \n%% \n");

        for (const parameter of parameters) {
            const filePath = path.join(predicateDir, `${parameter}.md`);
            fs.writeFileSync(filePath, `# ${parameter}\n\n`);
        }
    }

    // Add arity 2 predicates as links
    for (const [predicate, param1, param2] of arity2Predicates) {
        let matchFound = false;
        // Find which arity 1 predicate contains param1
        for (const [arity1Pred, params] of Object.entries(arity1Predicates)) {
            if (params.has(param1)) {
                const paramFilePath = path.join(outputDir, arity1Pred, `${param1}.md`);
                fs.appendFileSync(paramFilePath, `${predicate}::[[${param2}]]\n`);
                matchFound = true;
                break;
            }
        }
        
        if (!matchFound) {
            const uncategorizedDir = path.join(outputDir, "uncategorized");
            console.log(`Warning: No matching arity 1 predicate found for ${param1} in ${predicate}(${param1}, ${param2}). Saving in ${uncategorizedDir}`);
            fs.mkdirSync(uncategorizedDir, { recursive: true });
            const paramFilePath = path.join(uncategorizedDir, `${param1}.md`);
            fs.appendFileSync(paramFilePath, `${predicate}::[[${param2}]]\n`);
        }
    }

    console.log("Folders and files created successfully!");
}

function parseProlog(filePath: string): [Arity1Predicates, Arity2Predicate[]] {
    const content = readFile(filePath);
    return parsePrologPredicates(content);
}

function readFile(filePath: string): string {
    return fs.readFileSync(filePath, 'utf-8');
}

function parsePrologPredicates(content: string): [Arity1Predicates, Arity2Predicate[]] {
    const arity1Predicates: Arity1Predicates = {};
    const arity2Predicates: Arity2Predicate[] = [];

    // Parse arity 2 predicates
    const arity2Pattern = /(\w+)\((?:'([^']+)'|(\w+))\s*,\s*(?:'([^']+)'|(\w+))\)\./g;
    let match: RegExpExecArray | null;
    while ((match = arity2Pattern.exec(content)) !== null) {
        const [, predicate, quotedParam1, unquotedParam1, quotedParam2, unquotedParam2] = match;
        const param1 = quotedParam1 || unquotedParam1;
        const param2 = quotedParam2 || unquotedParam2;
        arity2Predicates.push([predicate, param1, param2]);
    }

    // Parse arity 1 predicates
    const arity1Pattern = /(\w+)\((?:'([^']+)'|(\w+))\)\./g;
    while ((match = arity1Pattern.exec(content)) !== null) {
        const [, predicate, quotedParam, unquotedParam] = match;
        const parameter = quotedParam || unquotedParam;
        if (!(predicate in arity1Predicates)) {
            arity1Predicates[predicate] = new Set();
        }
        arity1Predicates[predicate].add(parameter);
    }

    return [arity1Predicates, arity2Predicates];
}

export { createFoldersAndFiles, parseProlog };