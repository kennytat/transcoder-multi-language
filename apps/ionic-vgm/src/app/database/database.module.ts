import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DatabasePage } from './database.page';
import { DatabasePageRoutingModule } from './database-routing.module';
import { TreeviewModule } from 'ngx-treeview';
import { SharedModule } from '../features/shared/shared.module';

@NgModule({
  imports: [
    SharedModule,
    IonicModule,
    CommonModule,
    FormsModule,
    DatabasePageRoutingModule,
    TreeviewModule.forRoot()
  ],
  declarations: [DatabasePage],
})
export class DatabasePageModule { }
