import { NgModule, Optional, SkipSelf } from '@angular/core';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { throwIfAlreadyLoaded } from '@vgm-converter/xplat/utils';
import { VgmConverterCoreModule } from '@vgm-converter/xplat/web/core';

@NgModule({
  imports: [VgmConverterCoreModule, IonicModule.forRoot()],
  providers: [
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
  ],
})
export class VgmConverterIonicCoreModule {
  constructor(
    @Optional()
    @SkipSelf()
    parentModule: VgmConverterIonicCoreModule
  ) {
    throwIfAlreadyLoaded(parentModule, 'VgmConverterIonicCoreModule');
  }
}
