import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IpfsPage } from './ipfs.page';
// import { ExploreContainerComponentModule } from '../explore-container/explore-container.module';
import { SharedModule } from '../features/shared/shared.module';
import { IpfsPageRoutingModule } from './ipfs-routing.module';

@NgModule({
  imports: [
    SharedModule,
    IonicModule,
    CommonModule,
    FormsModule,
    // ExploreContainerComponentModule,
    // RouterModule.forChild([{ path: '', component: IpfsPage }]),
    IpfsPageRoutingModule,
  ],
  declarations: [IpfsPage],
})
export class IpfsPageModule { }
