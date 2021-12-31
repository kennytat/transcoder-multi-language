import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { IonicModule } from '@ionic/angular';

import { UIModule as UIWebModule } from '@vgm-converter/xplat/web/features';
import { HeaderComponent, SettingModalComponent } from './components';

@NgModule({
  imports: [UIWebModule, IonicModule],
  declarations: [
    HeaderComponent,
    SettingModalComponent
  ],
  exports: [
    UIWebModule,
    IonicModule,
    HeaderComponent,
    SettingModalComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class UIModule { }
