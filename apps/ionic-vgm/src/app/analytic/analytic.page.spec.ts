import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
// import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { AnalyticPage } from './analytic.page';

describe('AnalyticPage', () => {
	let component: AnalyticPage;
	let fixture: ComponentFixture<AnalyticPage>;

	beforeEach(
		waitForAsync(() => {
			TestBed.configureTestingModule({
				declarations: [AnalyticPage],
				imports: [
					IonicModule.forRoot(),
					// ExploreContainerComponentModule
				],
			}).compileComponents();

			fixture = TestBed.createComponent(AnalyticPage);
			component = fixture.componentInstance;
			fixture.detectChanges();
		})
	);

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
