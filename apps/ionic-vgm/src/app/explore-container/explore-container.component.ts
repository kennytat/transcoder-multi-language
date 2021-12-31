import { Component, OnInit, Input } from '@angular/core';

@Component({
  selector: 'vgm-converter-explore-container',
  templateUrl: './explore-container.component.html',
  styleUrls: ['./explore-container.component.scss'],
})
export class ExploreContainerComponent implements OnInit {
  @Input() name: string;

  constructor() {}

  ngOnInit() {}
}
