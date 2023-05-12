import { CommandRegistry } from '@theia/core/lib/common';
import { nls } from '@theia/core/lib/common/nls';
import { FormatType } from '@theia/core/lib/common/i18n/localization';

import { MessageService } from '@theia/core';

import { InvokeBackendService } from '../../common/protocol';
import { JavaServiceCommands } from '../java-service-commands';

const Unauthorized = 401;
const Forbidden = 403;

const IDATA_PARAM = '(IData)';
const ILLEGAL_CHARS: string[] = Array.from("?'- \\#&@^\\!%*\\:$./\\`;,~+\\=)(|}{][><\"");
const RESERVED_WORDS: string[] = [
	"abstract", "assert", "boolean", "break", "byte", "byvalue", "case", "cast", "default", "do", "double", "else",
	"extends", "false", "final", "goto", "if", "implements", "import", "inner", "instanceof", "int", "operator",
	"outer", "package", "private", "protected", "public", "rest", "synchronized", "this", "throw", "throws", "transient",
	"true", "try", "catch", "char", "class", "const", "continue", "finally", "float", "for", "future", "generic",
	"interface", "long", "native", "new", "null", "return", "short", "static", "super", "switch", "var", "void",
	"volatile", "while", "clone", "equals", "finalize", "getClass", "hashCode", "notify", "notifyAll", "toString", "wait",
	// RESERVED WORDS FOR C (not in Java)
	"auto", "enum", "extern", "register", "signed", "sizeof", "static", "struct", "typedef", "union", "unsigned",
	// RESERVED WORDS FOR C++ (not in Java)
	"asm", "delete", "friend", "inline", "template", "virtual"
]

const COLON = ':';
const UNDER_SCORE = '_';

export function handleError(error: any, messageService: MessageService, messageKey: string, messageDefault: string, ...args: FormatType[]) {

	console.error(error);
	if (error.message) {
		console.error(nls.localize(messageKey, messageDefault, error.message, ...args));
		messageService.error(
			nls.localize(messageKey, messageDefault, error.message, ...args)
		);
	}
	else {
		messageService.error(nls.localize(messageKey, messageDefault, error, ...args));
	}
}

export async function handleOther(response: any, invokeBackendService: InvokeBackendService, commandRegistry: CommandRegistry) {
	if (response.errorCode === Unauthorized || response.errorCode === Forbidden) {
		isSessionActive(invokeBackendService, commandRegistry);
	}
}

function isSessionActive(invokeBackendService: InvokeBackendService, commandRegistry: CommandRegistry) {
	invokeBackendService.isSessionActive().then((response: any) => {
		if (response['Status'] === 'false') {
			redirectToLogin(commandRegistry);
		}
	});
}

function redirectToLogin(commandRegistry: CommandRegistry) {
	commandRegistry.executeCommand(JavaServiceCommands.BACK_TO_ORIGIN_PROJECT.id);
}

export function validateName(javaServiceName: string, javaServices: string[]) {

	if (!javaServiceName || javaServiceName.length < 1) {
		return nls.localize('validate.jsname.missing.msg', 'The Java service name must be entered');
	}

	const c = javaServiceName.charAt(0);

	const testNum = Number(c);
	if (!isNaN(testNum)) {
		return nls.localize('validate.jsname.leading.digit.msg', 'The name cannot start with a leading numeric digit: {0}', c);
	}

	for (const illegalChar of ILLEGAL_CHARS) {
		const pos = javaServiceName.indexOf(illegalChar);
		if (pos > -1) {
			return nls.localize('validate.jsname.illegal.char.at.pos.msg', 'The name has an illegal character `{0}` at position {1}', illegalChar, pos);
		}
	}

	for (let i = 0; i < javaServiceName.length; i++) {
		const ch = javaServiceName.charAt(i);
		const chByte = ch.charCodeAt(0);
		if (chByte > 0x00FF) {
			return nls.localize('validate.jsname.illegal.char.at.pos.msg', 'The name has an illegal character `{0}` at position {1}', ch, i);
		}
	}

	// block reserved words (java, c) [especially important to codegen]
	if (RESERVED_WORDS.indexOf(javaServiceName) > -1) {
		return nls.localize('validate.jsname.reserved.word.msg', '`{0}` is a reserved word and cannot be used', javaServiceName);
	}

	if (javaServices.indexOf(javaServiceName + IDATA_PARAM) > -1) {
		return nls.localize('validate.jsname.already.exists.msg', '{0} already exists.', javaServiceName);
	}
	return '';
}

export function generateName(copiedJavaService: string, javaServices: string[]) {
	let nameExists = false;
	const colPos = copiedJavaService.indexOf(COLON);
	const javaServiceName = copiedJavaService.substr(colPos + 1);
	let newJavaServiceName = javaServiceName;
	let seqNr = 0;
	if (javaServices && javaServices.length > 0) {
		for (const javaService of javaServices) {
			let jsName = javaService;
			if (jsName.endsWith(IDATA_PARAM)) {
				jsName = jsName.substr(0, jsName.length - IDATA_PARAM.length);
			}
			if (jsName === javaServiceName) {
				nameExists = true;
				continue;
			}
			if (jsName.startsWith(javaServiceName)) {
				const uPos = jsName.lastIndexOf(UNDER_SCORE);
				if (uPos > 0) {
					const jsNamePrefix = jsName.substring(0, uPos);
					if (jsNamePrefix === javaServiceName) {
						const jsNameSuffix = jsName.substr(uPos + 1);
						if (jsNameSuffix && jsNameSuffix.length > 0) {
							if (!isNaN(+jsNameSuffix)) {
								if (+jsNameSuffix >= seqNr) {
									seqNr = +jsNameSuffix + 1;
								}
							}
						}
					}
				}
			}
		}
	}
	if (nameExists) {
		if (seqNr === 0) {
			newJavaServiceName += UNDER_SCORE + '1';
		}
		else {
			newJavaServiceName += UNDER_SCORE + seqNr;
		}
	}

	return newJavaServiceName;
}