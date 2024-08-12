export const ontologyContainerStyles =	`
		.ontology-container {
			display: flex;
			flex-direction: column;
		}
		.title-desc-container {
			display: flex;
			align-items: center;
			margin-bottom: 8px;
		}
		.title-desc-container .setting-item-name {
			font-weight: bold;
			margin-right: 8px;
		}
		.title-desc-container .setting-item-description {
			font-size: 0.8em;
			color: var(--text-muted);
		}
		.ontology-container .setting-item {
			border-top: none;
		}
		.ontology-container .setting-item-control {
			width: 100%;
		}
		.ontology-container textarea {
			width: 100%;
			min-height: 100px;
			margin-top: 8px;
			margin-bottom: 8px;
		}
	`

