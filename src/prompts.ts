const defaultOntology = `Classes:
     Abstract Action Amount of substrate Awareness level Biological level Category Change Chemical level Chronoid Concept Concrete Configuration Configuroid Continuous Continuous change Continuous process Dependent Discrete Discrete presential Discrete process Entity Extrinsic change Function History Independent Individual Instantanuous change Intrinsic change Item Level Line Mass entity Material boundary Material line Material object Material persistant Material point Material stratum Material structure Material surface Mental stratum Occurrent Ontological layer Persistant Personality level Physical level Point Presential Process Processual role Property Property value Relational role Relator Role Set Situation Situoid Social role Social stratum Space Space time Spatial boundary Spatial region State Stratum Surface Symbol Symbol sequence Symbol structure Temporal region Time Time boundary Token Topoid Universal Value space 

    Object Properties:
        abstract has part abstract part of agent in boundary of categorial part of category in layer caused by causes constituent part of depends on exists at framed by frames function determinant of functional item of goal of has boundary has categorial part has category has constituent part has function has function determinant has functional item has goal has left time boundary has member has part has participant has proper part has requirement has right time boundary has sequence constituent has spatial boundary has time boundary has token has value instance of instantiated by layer of left boundary of level of member of necessary for occupied by occupies on layer on level on stratum part of participates in plays role projection of projects to proper part of realized by realizes requirement of right boundary of role of sequence constituent of spatial boundary of stratum of time boundary of value of 
    `

function correctnessCheckPrompt(domain_subjects: string, ontology: string){
    return `You are a domain expert in the field of ${domain_subjects}.
    Check the Prolog code for correctness and completeness based on the text. Ensure all relationships are logically sound and perfectly consistent with the text.
    If you find any inconsistencies, correct them in the Prolog code.
    If anything is missing, add missing predicates.
    
    
    Please ONLY use the following predicates:

    ${ontology == "" ? defaultOntology : ontology}

    Please respond with prolog code only.
    `
}

function arityTwoPrompt(ontology: string){
    return `You are an expert at creating Knowledge Graphs in Prolog. 
    Translate sentences in the text into Prolog code using predicates of arity 2.
    Arity 2 predicates define relationships (verbs) between nouns, they are provided below. 

    You can ONLY use the following predicates:

    ${ontology == "" ? defaultOntology : ontology}

    Please respond with prolog code only.
    Text:
    `
}

export {defaultOntology, correctnessCheckPrompt, arityTwoPrompt}