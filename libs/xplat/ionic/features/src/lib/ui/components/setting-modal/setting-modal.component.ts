import { Component, Input, OnInit } from '@angular/core';
import { ToastController, ModalController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { ConfigService, LocalforageService } from '@vgm-converter/xplat/core';

@Component({
	selector: 'vgm-setting-modal',
	templateUrl: 'setting-modal.component.html'
})

export class SettingModalComponent implements OnInit {
	@Input() rcloneConf;
	selectedTab: string;
	checkingConf = false;

	constructor(
		public modalController: ModalController,
		public toastController: ToastController,
		private _translateService: TranslateService,
		private _configService: ConfigService,
		private _localForage: LocalforageService
	) {

	}

	async ngOnInit() {
		this.selectedTab = this.rcloneConf[0].id;
	}

	segmentChanged(e) {
		this.selectedTab = e.detail.value;
	}

	async saveConf(id) {
		this.checkingConf = true;
		console.log('checking conf:', id)
		const i = this.rcloneConf.findIndex(conf => conf.id === id)
		console.log('config saved:', this.rcloneConf[i]);
		await this._localForage.set(this.rcloneConf[i].id, this.rcloneConf[i]);

		const connectionResult = await this._configService.connCheck(this.rcloneConf[i]);
		this.checkingConf = false;

		if (connectionResult) {
			this.presentToast(this._translateService.instant('setting.s3.message-success'), 'toast-success');
		} else {
			this.presentToast(this._translateService.instant('setting.s3.message-error'), 'toast-error')
		}

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

	dismiss() {
		this.modalController.dismiss({
			'dismissed': true
		});
	}
}
