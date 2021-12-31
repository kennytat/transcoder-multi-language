import { Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import * as type from "./graphql.types";
import { Apollo, QueryRef } from 'apollo-angular';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  public _dbInit: boolean = false;
  videoDBQuery: QueryRef<any>;
  videoDBSub: Subscription;
  audioDBQuery: QueryRef<any>;
  audioDBSub: Subscription;

  videoTreeQuery: QueryRef<any>;
  audioTreeQuery: QueryRef<any>;
  videoTreeSub: Subscription;
  audioTreeSub: Subscription;

  levelSub: Subscription;

  queryGQL: any[] = [
    type.LEVEL_1_QUERIES,
    type.LEVEL_2_QUERIES,
    type.LEVEL_3_QUERIES,
    type.LEVEL_4_QUERIES,
    type.LEVEL_5_QUERIES,
    type.LEVEL_6_QUERIES,
    type.LEVEL_7_QUERIES,
  ];
  public videoDB: any[] = [];
  public videoDB$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  public videoTree: any = {};
  public videoTree$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  public audioDB: any[] = [];
  public audioDB$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([]);

  public audioTree: any = {};
  public audioTree$: BehaviorSubject<any> = new BehaviorSubject<any>({});

  constructor(private apollo: Apollo) {
    this.videoDB$.subscribe((newList: any[]) => {
      this.videoDB = newList;
    });
    this.videoTree$.subscribe((newTree: any) => {
      this.videoTree = newTree;
    });
    this.audioDB$.subscribe((newlist: any[]) => {
      this.audioDB = newlist;
    });
    this.audioTree$.subscribe((newTree: any) => {
      this.audioTree = newTree;
    });
  }


  async dbInit() {
    try {
      // await this.fetchDB();
      await this.fetchTree();
    } catch (error) {
      console.log(error);
    }
    return new Promise((resolve) => {
      if (this.videoDB && this.videoTree && this.audioDB && this.audioTree) {
        this._dbInit = true;
        resolve(null);
      }
    });
  }

  async fetchDB() {
    this.videoDBQuery = this.apollo.watchQuery<any>({
      query: type.ALL_DATA,
      variables: {
        id: '00000000-0000-0000-0000-000000000001'
      },
      fetchPolicy: 'cache-and-network',
    })
    this.videoDBSub = this.videoDBQuery.valueChanges.subscribe(({ data }) => {
      this.videoDB$.next([_.cloneDeep(data[Object.keys(data)[0]])]);
    });

    this.audioDBQuery = this.apollo.watchQuery<any>({
      query: type.ALL_DATA,
      variables: {
        id: '00000000-0000-0000-0000-000000000002'
      },
      fetchPolicy: 'cache-and-network',
    })
    this.audioDBSub = this.audioDBQuery.valueChanges.subscribe(({ data }) => {
      this.audioDB$.next([_.cloneDeep(data[Object.keys(data)[0]])]);
    });
  }

  async fetchTree() {
    this.videoTreeQuery = this.apollo.watchQuery<any>({
      query: type.LEVEL_1_TREE,
      variables: {
        id: '00000000-0000-0000-0000-000000000001'
      },
      fetchPolicy: 'cache-and-network'
    })
    this.videoTreeSub = this.videoTreeQuery.valueChanges.subscribe(({ data }) => {
      this.videoTree$.next(_.cloneDeep(data[Object.keys(data)[0]]));
    });


    this.audioTreeQuery = this.apollo.watchQuery<any>({
      query: type.LEVEL_1_TREE,
      variables: {
        id: '00000000-0000-0000-0000-000000000002'
      },
      fetchPolicy: 'cache-and-network'
    })
    this.audioTreeSub = this.audioTreeQuery.valueChanges.subscribe(({ data }) => {
      this.audioTree$.next(_.cloneDeep(data[Object.keys(data)[0]]));
    });
  }

  dbRefresh(isVideo: boolean) {
    if (isVideo) {
      this.videoDBQuery.refetch();
    } else {
      this.audioDBQuery.refetch();
    }
  }

  treeRefresh(isVideo: boolean) {
    if (isVideo) {
      this.videoTreeQuery.refetch();
    } else {
      this.audioTreeQuery.refetch();
    }
  }


  async fetchLevelDB(level: number, isVideo: boolean, isLeaf?, id?: string): Promise<any> {
    return new Promise((resolve) => {
      this.levelSub = this.apollo.watchQuery<any>({
        query: this.queryGQL[level - 1],
        variables: {
          isVideo: isVideo,
          isLeaf: isLeaf,
          id: id
        },
        fetchPolicy: 'cache-and-network',
      }).valueChanges.subscribe(({ data }) => {
        const list = data[Object.keys(data)[0]];
        // console.log(level, list);

        if (list) resolve(list);
      });

    });
  }


  ngOnDestroy() {
    (this.videoDBSub, this.audioDBSub, this.videoTreeSub, this.audioTreeSub, this.levelSub as Subscription).unsubscribe();
  }
}
