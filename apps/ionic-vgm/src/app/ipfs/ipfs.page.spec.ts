import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
// import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';

import { IpfsPage } from './ipfs.page';

describe('IpfsPage', () => {
  let component: IpfsPage;
  let fixture: ComponentFixture<IpfsPage>;

  beforeEach(
    waitForAsync(() => {
      TestBed.configureTestingModule({
        declarations: [IpfsPage],
        imports: [
          IonicModule.forRoot(),
          // ExploreContainerComponentModule
        ],
      }).compileComponents();

      fixture = TestBed.createComponent(IpfsPage);
      component = fixture.componentInstance;
      fixture.detectChanges();
    })
  );

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
