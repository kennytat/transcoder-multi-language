import { Component, OnInit } from '@angular/core';
import { ModalController, ToastController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService } from '@vgm-converter/xplat/core';
import { SettingModalComponent } from '@vgm-converter/xplat/ionic/features';

@Component({
	selector: 'vgm-converter-tabs',
	templateUrl: 'tabs.page.html',
	styleUrls: ['tabs.page.scss'],
})
export class TabsPage implements OnInit {
	confValid = false;
	darkMode = false;
	constructor(
		public modalController: ModalController,
		public toastController: ToastController,
		private _configService: ConfigService,
		private _translateService: TranslateService,
	) { }

	async ngOnInit() {
		this.confValid = await this._configService.confCheck() as boolean;
		if (!this.confValid) this.editSetting();
	}

	darkModeChange() {
		this.darkMode = !this.darkMode
		return this.darkMode ? document.body.setAttribute('data-theme', 'dark') : document.body.setAttribute('data-theme', 'light');
	}


	async editSetting() {
		this.confValid = await this._configService.confCheck() as boolean;
		this.presentModal();
		if (this.confValid) {
			await this.presentToast(this._translateService.instant('setting.s3.message-success'), 'toast-success');
		} else {
			await this.presentToast(this._translateService.instant('setting.s3.message-error'), 'toast-error')
		}
	}

	async presentModal() {
		const modal = await this.modalController.create({
			component: SettingModalComponent,
			cssClass: 'setting-modal',
			animated: false,
			componentProps: {
				rcloneConf: this._configService.configs
			}
		});
		return await modal.present();
	}

	async presentToast(message, cssClass) {
		const toast = await this.toastController.create({
			message: message,
			position: 'top',
			duration: 2000,
			cssClass: cssClass
		});
		toast.present();
	}
}
