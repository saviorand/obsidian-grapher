import * as fs from 'fs';
import * as path from 'path';

interface Arity1Predicates {
    [key: string]: Set<string>;
}

type Arity2Predicate = [string, string, string];

function createFoldersAndFiles(
    arity2Predicates: Arity2Predicate[],
    outputDir: string,
    parentRelations: string,
    childRelations: string
): void {
    fs.mkdirSync(outputDir, { recursive: true });

    const parentRelationsArray = parentRelations.split(", ");
    const childRelationsArray = childRelations.split(", ");
    const parentRelationsArrayUnderscore = parentRelationsArray.map((relation) => relation.replace(/ /g, "_"));
    const childRelationsArrayUnderscore = childRelationsArray.map((relation) => relation.replace(/ /g, "_"));

    const parentChildMap = new Map<string, Set<string>>();
    const processedChildren = new Set<string>();

    for (const [predicate, param1, param2] of arity2Predicates) {
        if (parentRelationsArrayUnderscore.includes(predicate)) {
            if (!parentChildMap.has(param1)) {
                parentChildMap.set(param1, new Set());
            }
            parentChildMap.get(param1)!.add(param2);
        }
    }

    for (const [predicate, param1, param2] of arity2Predicates) {
        let matchFound = false;
        if (param1 === param2) {
            console.log(`Skipping self-referential predicate: ${predicate}(${param1}, ${param2})`);
            continue;
        }

        if (parentRelationsArrayUnderscore.includes(predicate)) {
            matchFound = true;
            processParentRelation(outputDir, predicate, param1, param2, parentChildMap, processedChildren);
        }
        
        if (!matchFound && !processedChildren.has(param1) && !processedChildren.has(param2)) {
            const param1FilePath = path.join(outputDir, `${param1}.md`);
            if (!fs.existsSync(param1FilePath)) {
                fs.appendFileSync(param1FilePath, `${predicate}::[[${param2}]]\n`);
            }
            const param2FilePath = path.join(outputDir, `${param2}.md`);
            if (!fs.existsSync(param2FilePath)) {
                fs.appendFileSync(param2FilePath, `${predicate}::[[${param1}]]\n`);
            }
        }
    }
}

function processParentRelation(
    outputDir: string, 
    predicate: string, 
    param1: string, 
    param2: string, 
    parentChildMap: Map<string, Set<string>>,
    processedChildren: Set<string>
) {
    const createParentStructure = (currentDir: string, parent: string, child: string, dirPath: string[]) => {
        const newPath = [...dirPath, parent];
        const fullParentDir = path.join(currentDir, ...newPath);
        
        if (!fs.existsSync(fullParentDir)) {
            fs.mkdirSync(fullParentDir, { recursive: true });
        }
        
        const parentFilePath = path.join(fullParentDir, `${parent}.md`);
        if (!fs.existsSync(parentFilePath)) {
            fs.appendFileSync(parentFilePath, "%% Waypoint %% \n");
        }
        
        if (parent !== child) {
        const relationPredicate = `${predicate}::[[${child}]]\n`;
        if (fs.existsSync(parentFilePath) && !fs.readFileSync(parentFilePath, 'utf-8').includes(relationPredicate)) {
            fs.appendFileSync(parentFilePath, relationPredicate);
        }
        }
        
        if (!parentChildMap.has(child)) {
            const childFilePath = path.join(fullParentDir, `${child}.md`);
            if (!fs.existsSync(childFilePath)) {
                fs.writeFileSync(childFilePath, "");
            }
        }
    };

    const processHierarchy = (node: string, currentPath: string[]) => {
        if (processedChildren.has(node)) return;
        processedChildren.add(node);

        if (parentChildMap.has(node)) {
            for (const child of parentChildMap.get(node)!) {
                createParentStructure(outputDir, node, child, currentPath);
                processHierarchy(child, [...currentPath, node]);
            }
        }
    };

    const findRoot = (node: string): string => {
        for (const [parent, children] of parentChildMap.entries()) {
            if (children.has(node)) {
                return findRoot(parent);
            }
        }
        return node;
    };

    const root = findRoot(param1);
    createParentStructure(outputDir, root, root, []);
    processHierarchy(root, []);
}

function parsePrologPredicates(content: string): [Arity1Predicates, Arity2Predicate[]] {
    const arity1Predicates: Arity1Predicates = {};
    const arity2Predicates: Arity2Predicate[] = [];

    const arity2Pattern = /(\w+)\((?:'([^']+)'|(\w+))\s*,\s*(?:'([^']+)'|(\w+))\)\./g;
    let match: RegExpExecArray | null;
    while ((match = arity2Pattern.exec(content)) !== null) {
        const [, predicate, quotedParam1, unquotedParam1, quotedParam2, unquotedParam2] = match;
        const param1 = quotedParam1 || unquotedParam1;
        const param2 = quotedParam2 || unquotedParam2;
        arity2Predicates.push([predicate, param1, param2]);
    }

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

export { createFoldersAndFiles, parsePrologPredicates };