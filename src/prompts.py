def correctness_check_prompt():
    # optionally add You are a domain expert in the field of {domain_subjects}.
    return f'''Check the Prolog code for correctness and completeness based on the text. Ensure all relationships are logically sound and perfectly consistent with the text.
    If you find any inconsistencies, correct them in the Prolog code.
    If anything is missing, add missing predicates.
    
    
    Please ONLY use the following predicates from the GFO ontology:

    Classes:
        Abstract Action Amount of substrate Awareness level Biological level Category Change Chemical level Chronoid Concept Concrete Configuration Configuroid Continuous Continuous change Continuous process Dependent Discrete Discrete presential Discrete process Entity Extrinsic change Function History Independent Individual Instantanuous change Intrinsic change Item Level Line Mass entity Material boundary Material line Material object Material persistant Material point Material stratum Material structure Material surface Mental stratum Occurrent Ontological layer Persistant Personality level Physical level Point Presential Process Processual role Property Property value Relational role Relator Role Set Situation Situoid Social role Social stratum Space Space time Spatial boundary Spatial region State Stratum Surface Symbol Symbol sequence Symbol structure Temporal region Time Time boundary Token Topoid Universal Value space 

    Object Properties:
        abstract has part abstract part of agent in boundary of categorial part of category in layer caused by causes constituent part of depends on exists at framed by frames function determinant of functional item of goal of has boundary has categorial part has category has constituent part has function has function determinant has functional item has goal has left time boundary has member has part has participant has proper part has requirement has right time boundary has sequence constituent has spatial boundary has time boundary has token has value instance of instantiated by layer of left boundary of level of member of necessary for occupied by occupies on layer on level on stratum part of participates in plays role projection of projects to proper part of realized by realizes requirement of right boundary of role of sequence constituent of spatial boundary of stratum of time boundary of value of 

    Please respond with prolog code only.
    '''

arity_two_prompt = '''You are an expert at creating Knowledge Graphs in Prolog. 
Translate sentences in the text into Prolog code using predicates of arity 2.
Arity 2 predicates define relationships (verbs) between nouns, they are provided below. 

You can ONLY use the following predicates:

Classes:
     Abstract Action Amount of substrate Awareness level Biological level Category Change Chemical level Chronoid Concept Concrete Configuration Configuroid Continuous Continuous change Continuous process Dependent Discrete Discrete presential Discrete process Entity Extrinsic change Function History Independent Individual Instantanuous change Intrinsic change Item Level Line Mass entity Material boundary Material line Material object Material persistant Material point Material stratum Material structure Material surface Mental stratum Occurrent Ontological layer Persistant Personality level Physical level Point Presential Process Processual role Property Property value Relational role Relator Role Set Situation Situoid Social role Social stratum Space Space time Spatial boundary Spatial region State Stratum Surface Symbol Symbol sequence Symbol structure Temporal region Time Time boundary Token Topoid Universal Value space 

Object Properties:
    abstract has part abstract part of agent in boundary of categorial part of category in layer caused by causes constituent part of depends on exists at framed by frames function determinant of functional item of goal of has boundary has categorial part has category has constituent part has function has function determinant has functional item has goal has left time boundary has member has part has participant has proper part has requirement has right time boundary has sequence constituent has spatial boundary has time boundary has token has value instance of instantiated by layer of left boundary of level of member of necessary for occupied by occupies on layer on level on stratum part of participates in plays role projection of projects to proper part of realized by realizes requirement of right boundary of role of sequence constituent of spatial boundary of stratum of time boundary of value of 

Please respond with prolog code only.
Text:
'''

relation_prompt = '''You are an expert at creating Knowledge Graphs in Prolog. 
Translate sentences in the text into Prolog code using predicates of arity 2.
Arity 2 predicates define relationships (verbs) between nouns, they are provided below. 

You can ONLY use the following predicates:
category/2
challenges/2
contributes/2
creates/2
does/2
provokes/2
targets/2
parent/2

Please respond with prolog code only.

Example:
Text: "John creates a project. The project targets education."
Step-by-Step Translation:
	a.	Entities and Objects: "John", "project", "education"
	b.	Relationships: "creates", "targets"
	c.	Arity 2 Predicates:
creates(john, project).
targets(project, education).
	e.	Validation: Ensure all entities and relationships are included and correctly formatted.
	f.	Output:
creates(john, project).
targets(project, education).

Text:'''

categories_prompt = '''You are an expert at creating Knowledge Graphs in Prolog.
Categorize the list of entities using Prolog predicates of arity 1. Only assign 1 category to 1 entity.

You can ONLY use the following predicates:
abstract_concept/1
physical_entity/1
country/1
person/1
organization/1
event/1
theoretical_framework/1

Please respond with prolog code only.

Example:
Entities: "John", "Cuba", "Mount Everest", "education"
Step-by-Step Translation:
    a.	Entities: "John", "Cuba", "Mount Everest", "education"
    b.	Categories: "person", "country", "physical_entity", "abstract_concept"
    c.	Arity 1 Predicates:
person(john).
country(cuba).
physical_entity(mount_everest).
abstract_concept(education).
    d.	Validation: Ensure all entities are categorized and correctly formatted.
    e.	Output:
person(john).
country(cuba).
physical_entity(mount_everest).
abstract_concept(education).

Entities:
'''
