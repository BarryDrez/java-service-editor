import { Command } from '@theia/core/lib/common';
import { nls } from '@theia/core/lib/common/nls';
import { codicon } from '@theia/core/lib/browser/widgets';

export namespace JavaServiceCommands {

	export const BACK_TO_ORIGIN_PROJECT: Command = {
		id: 'com.softwareag.back.to.origin.project.command',
		label: nls.localize('commands.back.to.origin.project.command', 'Return to project')
	}

	export const NEW_JAVA_SERVICE: Command = {
		id: 'com.softwareag.new.java.service.command',
		label: nls.localize('commands.new.java.service.command', 'Add a new Java Service'),
		iconClass: 'java-service-taskbar-icon'
	}

	export const DELETE_JAVA_SERVICE: Command = {
		id: 'com.softwareag.delete.java.service.command',
		label: nls.localize('commands.delete.java.service.command', 'Delete the selected Java service'),
		iconClass: 'dlt-icon-delete'
	}

	export const INPUT_OUTPUT: Command = {
		id: 'com.softwareag.java.service.input.output',
		label: nls.localize('commands.input.output.signature.command', 'Define I/O'),
		iconClass: 'ut-icon-action-bar_io'
	}

	export const LOG_BUSINESS_DATA: Command = {
		id: 'com.softwareag.java.service.log.business.data',
		label: nls.localize('commands.log.business.data.command', 'Log business data'),
		iconClass: 'dlt-icon-document'
	}

	export const JAVA_SUITE_SAVE: Command = {
		id: 'com.softwareag.save.java.suite.command',
		label: nls.localize('commands.save.java.suite.command', 'Save')
	}

	export const JAVA_SUITE_COMPILE: Command = {
		id: 'com.softwareag.compile.java.suite.command',
		label: nls.localize('commands.compile.java.suite.command', 'Compile')
	}

	export const JAVA_SUITE_REFRESH: Command = {
		id: 'com.softwareag.refresh.java.suite.command',
		label: nls.localize('commands.refresh.java.suite.command', 'Refresh')
	}

	export const JAVA_SUITE_SAVE_WITH_MESSAGE: Command = {
		id: 'js-taskbar.save.java.suite.with.message.command',
		label: nls.localize('commands.save.java.suite.with.message.command', 'Save with message'),
		iconClass: 'saveWithMessageIcon'
	}

	export const ONLINE_HELP: Command = {
		id: 'com.softwareag.online.help.command',
		label: nls.localize('commands.help.online.command', 'Online help')
	}

	export const INTRO_TOUR: Command = {
		id: 'com.softwareag.intro.tour.command',
		label: nls.localize('commands.help.intro.tour.command', 'Intro tour')
	}

	export const SCHEDULE: Command = {
		id: 'com.softwareag.schedule.command',
		label: nls.localize('commands.schedule.command', 'Schedule'),
		iconClass: 'dlt-icon-calendar'
	}

	export const KEY_SHORTCUTS: Command = {
		id: 'com.softwareag.key.shortcuts.command',
		label: nls.localize('commands.key.shortcuts.command', 'Key shortcuts'),
		iconClass: 'dlt-icon-keyboard'
	}

	export const EXECUTION_HISTORY: Command = {
		id: 'com.softwareag.execution.history.command',
		label: nls.localize('commands.execution.history.command', 'Execution history'),
		iconClass: 'dlt-icon-database-administrator'
	}

	export const VERSION_HISTORY: Command = {
		id: 'com.softwareag.version.history.command',
		label: nls.localize('commands.version.history.command', 'Version history'),
		iconClass: 'dlt-icon-history'
	}

	export const DEBUG_INTEGRATION_SERVER_START: Command = {
		id: 'com.softwareag.integration.server.startdebug.command',
		label: nls.localize('commands.start.remote.debugger.command', 'Start Integration Server remote debugger')
	};

	export const DEBUG_INTEGRATION_SERVER_STOP: Command = {
		id: 'com.softwareag.integration.server.stopdebug.command',
		label: nls.localize('commands.stop.remote.debugger.command', 'Stop Integration Server remote debugger')
	};

	export const DEBUG_JAVA_SERVICE: Command = {
		id: 'com.softwareag.javaservice.debug.command',
		label: nls.localize('commands.debug.java.service.command', 'Debug Java service'),
		iconClass: 'dlt-icon-bug'
	};

	export const RUN_JAVA_SERVICE: Command = {
		id: 'com.softwareag.javaservice.invoke.command',
		label: nls.localize('commands.run.java.service.command', 'Run Java service'),
		iconClass: 'dlt-icon-play-circle'
	};

	export const TOGGLE_DEBUG_VIEW: Command = {
		id: 'com.softwareag.toggle.debug.view.command',
		label: nls.localize('commands.toggle.debug.view.command', 'Toggle Debug view')
	};

	export const CLOSE_OUTLINE_VIEW: Command = {
		id: 'com.softwareag.close.outline.view.command',
		label: nls.localize('commands.close.outline.view.command', 'Close Outline view'),
		iconClass: 'dlt-icon-close'
	};

	export const SHOW_REFERENCED_LIBS_VIEW: Command = {
		id: 'com.softwareag.show.referenced.libs.view.command',
		label: nls.localize('commands.third.party.libs.view.command', 'Referenced libraries'),
		iconClass: codicon('library')
	};

	export const CLOSE_REFERENCED_LIBS_VIEW: Command = {
		id: 'com.softwareag.close.referenced.libs.view.command',
		label: nls.localize('commands.close.third.party.libs.view.command', 'Close Referenced libraries')
	};

	export const SHOW_LAST_INVOCATION_VIEW: Command = {
		id: 'com.softwareag.last.invocation.view.command',
		label: nls.localize('commands.last.invocation.view.command', 'Service results'),
	};

	export const INFO_LAST_INVOCATION_VIEW: Command = {
		id: 'com.softwareag.info.last.invocation.view.command',
		label: nls.localize('commands.info.last.invocation.view.command', 'More information'),
		iconClass: 'dlt-icon-info'
	};

	export const DOWNLOAD_LAST_INVOCATION_VIEW: Command = {
		id: 'com.softwareag.download.last.invocation.view.command',
		label: nls.localize('commands.download.last.invocation.view.command', 'Download the results'),
		iconClass: 'dlt-icon-download'
	};

	export const CLOSE_LAST_INVOCATION_VIEW: Command = {
		id: 'com.softwareag.close.last.invocation.view.command',
		label: nls.localize('commands.close.last.invocation.view.command', 'Close Service results view'),
		iconClass: 'dlt-icon-close'
	};

	export const JS_CUT: Command = {
		id: 'com.softwareag.cut.command',
		label: nls.localize('action.bar.cut.text', 'Cut {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
		iconClass: 'cutIcon'
	};

	export const JS_COPY: Command = {
		id: 'com.softwareag.copy.command',
		label: nls.localize('action.bar.copy.text', 'Copy {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
		iconClass: 'dlt-icon-copy'
	};

	export const JS_PASTE: Command = {
		id: 'com.softwareag.paste.command',
		label: nls.localize('action.bar.paste.text', 'Paste {0}', nls.localize('action.bar.edit.java.service', 'Java service')),
		iconClass: 'dlt-icon-paste'
	};

	export const JS_DUPLICATE: Command = {
		id: 'com.softwareag.duplicate.command',
		label: nls.localize('action.bar.duplicate.text', 'Duplicate Java service'),
		iconClass: 'dlt-icon-duplicate'
	};

	export const JS_TOGGLE_LINE_COMMENT: Command = {
		id: 'com.softwareag.toggle.line.comment.command',
		label: nls.localize('action.bar.toggle.line.comment.text', 'Toggle line comment'),
		iconClass: 'lineCommentIcon'
	};

	export const JS_TOGGLE_BLOCK_COMMENT: Command = {
		id: 'com.softwareag.toggle.block.comment.command',
		label: nls.localize('action.bar.toggle.block.comment.text', 'Toggle block comment'),
		iconClass: 'blockCommentIcon'
	};
}