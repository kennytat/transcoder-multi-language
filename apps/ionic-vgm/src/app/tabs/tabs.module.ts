import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '../features/shared/shared.module';
import { TabsPageRoutingModule } from './tabs-routing.module';

import { TabsPage } from './tabs.page';

@NgModule({
	imports: [
		SharedModule,
		IonicModule,
		CommonModule,
		FormsModule,
		TabsPageRoutingModule],
	declarations: [TabsPage],
})
export class TabsPageModule { }
