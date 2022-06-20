import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticPage } from './analytic.page';
// import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { SharedModule } from '../features/shared/shared.module';
import { AnalyticPageRoutingModule } from './analytic-routing.module';

@NgModule({
	imports: [
		SharedModule,
		IonicModule,
		CommonModule,
		FormsModule,
		// ExploreContainerComponentModule,
		// RouterModule.forChild([{ path: '', component: AnalyticPage }]),
		AnalyticPageRoutingModule,
	],
	declarations: [AnalyticPage],
})
export class AnalyticPageModule { }
