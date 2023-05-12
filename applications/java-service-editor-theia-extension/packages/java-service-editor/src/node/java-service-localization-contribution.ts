import { LocalizationContribution, LocalizationRegistry } from '@theia/core/lib/node/i18n/localization-contribution';
import { injectable } from '@theia/core/shared/inversify';

@injectable()
export class JavaServiceLocalizationContribution implements LocalizationContribution {
	async registerLocalizations(registry: LocalizationRegistry): Promise<void> {
		registry.registerLocalizationFromRequire('en', require('../../data/i18n/nls.en.json'));
		// registry.registerLocalizationFromRequire('de', require('../../data/i18n/nls.de.json'));
		// registry.registerLocalizationFromRequire('it', require('../data/i18n/nls.it.json'));
		// registry.registerLocalizationFromRequire('zh-cn', require('../data/i18n/nls.zh-cn.json'));
	}
}