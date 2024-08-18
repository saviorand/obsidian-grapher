const defaultOntologyFull = `Classes:
     abstract concrete action category change chronoid continuous continuous_change continuous_process dependent discrete discrete_presential discrete_process extrinsic change function history independent individual instantanuous_change intrinsic_change item level line mass entity material_boundary material_object material_persistant material_point material_structure material_surface occurrent persistant point presential process processual_role property property_value role set situation situoid social_role social_stratum space spatial_boundary spatial_region state stratum surface symbol symbol_sequence symbol_structure temporal_region time time_boundary token topoid universal value_space 

    Object Properties:
        agent_in boundary_of caused_by causes depends_on exists_at framed_by frames goal_of has_boundary has_category has_function has_goal has_left_time_boundary has_member has_part has_participant has_requirement has_right_time_boundary has_sequence_constituent has_spatial_boundary has_time_boundary has_token has_value instance_of instantiated_by layer_of left_boundary_of level_of member_of necessary_for occupied_by occupies on_layer on_level on_stratum part_of participates_in plays_role projection_of projects_to realized_by realizes requirement_of right_boundary_of role_of spatial_boundary_of stratum_of time_boundary_of value_of 
    `

const defaultOntology = `Classes:
     abstract concrete action category change chronoid continuous continuous_change continuous_process dependent discrete discrete_presential discrete_process extrinsic change function history independent individual instantanuous_change intrinsic_change item level line mass entity material_boundary material_object material_persistant material_point material_structure material_surface occurrent persistant point presential process processual_role property property_value role set situation situoid social_role social_stratum space spatial_boundary spatial_region state stratum surface symbol symbol_sequence symbol_structure temporal_region time time_boundary token topoid universal value_space 

    Object Properties:
        agent_in boundary_of caused_by causes depends_on exists_at framed_by frames goal_of has_boundary has_function has_goal has_left_time_boundary has_member has_part has_participant has_requirement has_right_time_boundary has_spatial_boundary has_time_boundary has_token has_value instantiated_by layer_of left_boundary_of level_of necessary_for occupied_by occupies on_layer on_level on_stratum participates_in plays_role projection_of projects_to realized_by realizes requirement_of right_boundary_of role_of spatial_boundary_of stratum_of time_boundary_of value_of 
    `

const defaultParentRelations = "has_part instantiated_by realized_by role_of spatial_boundary_of stratum_of time_boundary_of has_value"

const titlePrompt = "Generate a title for the given text. The title should be 2-6 words that capture the essence of the text. Please respond with the title only. Text:"

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

export {defaultOntology, correctnessCheckPrompt, arityTwoPrompt, titlePrompt}