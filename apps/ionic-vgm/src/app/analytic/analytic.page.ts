import { Component, NgZone } from '@angular/core';
import { ElectronService } from 'ngx-electron';

@Component({
	selector: 'vgm-analytic',
	templateUrl: 'analytic.page.html',
	styleUrls: ['analytic.page.scss'],
})
export class AnalyticPage {
	constructor(
		private _electronService: ElectronService,
		private zone: NgZone
	) { }



}
