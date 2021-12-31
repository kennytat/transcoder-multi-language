import { Component } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { SettingModalComponent } from '@vgm-converter/xplat/ionic/features';
@Component({
  selector: 'vgm-converter-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
})
export class TabsPage {
  constructor(
    public modalController: ModalController
  ) { }

  darkModeChange(event) {
    let systemDark = window.matchMedia("(prefers-color-scheme: dark)");
    systemDark.addListener(this.colorTest);
    if (event.detail.checked) {
      document.body.setAttribute('data-theme', 'dark');
    }
    else {
      document.body.setAttribute('data-theme', 'light');
    }
  }
  colorTest(systemInitiatedDark) {
    if (systemInitiatedDark.matches) {
      document.body.setAttribute('data-theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
    }
  }

  editSetting() {
    this.presentModal()
  }
  async presentModal() {
    const modal = await this.modalController.create({
      component: SettingModalComponent,
      cssClass: 'share-modal',
      animated: false,
      componentProps: {}
    });
    return await modal.present();
  }
}
