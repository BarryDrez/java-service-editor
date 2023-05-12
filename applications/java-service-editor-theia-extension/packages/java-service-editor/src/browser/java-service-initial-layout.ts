export abstract class JavaServiceInitialLayout {

	public static get initialLayout(): any {
		return JSON.stringify({
			version: 5,
			mainPanel: {
				main: null
			},
			bottomPanel: {
				config: {
					main: {
						type: "tab-area",
						widgets: [
							{
								constructionOptions: {
									factoryId: "problems"
								},
								innerWidgetState: {}
							},
							{
								constructionOptions: {
									factoryId: "outputView"
								},
								innerWidgetState: {}
							},
							{
								constructionOptions: {
									factoryId: "debug-console"
								},
								innerWidgetState: {}
							},
							{
								constructionOptions: {
									factoryId: "callhierarchy"
								},
								innerWidgetState: {}
							},
							{
								constructionOptions: {
									factoryId: "referenced-libs-container"
								},
								innerWidgetState: {}
							}
						],
						currentIndex: 0
					}
				},
				size: 350,
				expanded: true
			},
			leftPanel: {
				type: "sidepanel",
				items: [
					{
						widget: {
							constructionOptions: {
								factoryId: "debug"
							},
							innerWidgetState: {}
						},
						rank: 400,
						expanded: false
					}
				]
			},
			rightPanel: {
				type: "sidepanel",
				items: [
					{
						widget: {
							constructionOptions: {
								factoryId: "outline-view"
							},
							innerWidgetState: {}
						},
						rank: 500,
						expanded: true
					}
				],
				size: 370
			}
		});
	}
}