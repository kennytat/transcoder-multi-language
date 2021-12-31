import 'reflect-metadata'
import {
  Resolver,
  Query,
  Mutation,
  Args,
  Context,
  ResolveField,
  Root,
  InputType,
  Field,
  Int,
  Float
} from '@nestjs/graphql'
import { Inject } from '@nestjs/common'
import { PrismaService } from '../prisma.service'


import { Level4 } from '../models/level4.model'
import { Level5 } from '../models/level5.model'
import { Level6 } from '../models/level6.model'

@InputType()
export class Level5UpdateInput {

  @Field((type) => String)
  id: string

  @Field((type) => Boolean, { nullable: true })
  isLeaf?: boolean

  @Field((type) => Int, { nullable: true })
  count?: number

  @Field((type) => String, { nullable: true })
  location?: string

  @Field((type) => String, { nullable: true })
  url?: string

  @Field((type) => String, { nullable: true })
  name?: string

  @Field((type) => String, { nullable: true })
  keyword?: string

  @Field((type) => String, { nullable: true })
  hash?: string

  @Field((type) => String, { nullable: true })
  qm?: string

  @Field((type) => Int, { nullable: true })
  audience?: number

  @Field((type) => Int, { nullable: true })
  mtime?: number

  @Field((type) => Int, { nullable: true })
  viewCount?: number

}
@InputType()
export class Level5CreateInput {

  @Field((type) => String)
  pid: string

  @Field((type) => Boolean, { nullable: true })
  isLeaf: boolean

  @Field((type) => String)
  location: string

  @Field((type) => String)
  url: string

  @Field((type) => Boolean)
  isVideo: boolean

  @Field((type) => String)
  name: string

  @Field((type) => Int, { nullable: true })
  count?: number

  @Field((type) => String, { nullable: true })
  keyword?: string

  @Field((type) => String, { nullable: true })
  thumb?: string

  @Field((type) => String, { nullable: true })
  qm?: string

  @Field((type) => String, { nullable: true })
  hash?: string

  @Field((type) => Int, { nullable: true })
  audience?: number

  @Field((type) => Int, { nullable: true })
  mtime?: number

  @Field((type) => Int, { nullable: true })
  viewCount?: number

  @Field((type) => String, { nullable: true })
  duration?: string

  @Field((type) => Float, { nullable: true })
  size?: number
}
@Resolver(Level5)
export class Level5Resolver {
  constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

  @Query(() => Level5, { name: 'level5Unique' })
  async getSelf(@Args('id', { type: () => String }) id: string) {
    return this.prismaService.level5.findUnique({
      where: {
        id: id
      }
    });
  }

  @ResolveField('parent', () => [Level4])
  async getParent(@Root() level5: Level5) {
    return this.prismaService.level4.findUnique({
      where: {
        id: level5.pid,
      },
    })
  }

  @ResolveField('children', () => [Level6])
  async getChildren(@Root() level5: Level5) {
    return this.prismaService.level6.findMany({
      where: {
        pid: level5.id
      }
    });
  }

  @Query((returns) => [Level5])
  level5Queries(
    @Args('isVideo') isVideo: boolean,
    @Args('isLeaf', { nullable: true }) isLeaf: boolean,
    @Args('id', { nullable: true }) id: string,
    @Context() ctx) {
    // const or = isVideo
    //   ? {
    //     OR: [{
    //       isVideo: isVideo,
    //       isLeaf: isLeaf,
    //       id: id
    //     }],
    //   } : {}
    return this.prismaService.level5.findMany({
      where: {
        isVideo: isVideo,
        isLeaf: isLeaf,
        id: id
      },
    })
  }

  @Mutation((returns) => Level5)
  createLevel5(
    @Args('data') data: Level5CreateInput,
    @Context() ctx,
  ) {
    return this.prismaService.level5.create({
      data: {
        isLeaf: data.isLeaf,
        location: data.location,
        url: data.url,
        isVideo: data.isVideo,
        name: data.name,
        count: data.count,
        keyword: data.keyword,
        thumb: data.thumb,
        qm: data.qm,
        hash: data.hash,
        audience: data.audience,
        mtime: data.mtime,
        viewCount: data.viewCount,
        duration: data.duration,
        size: data.size,
        parent: {
          connect: {
            id: data.pid
          }
        }
      },
    })
  }

  @Mutation((returns) => Level5)
  updateLevel5(
    @Args('data') data: Level5UpdateInput,
    @Context() ctx,
  ) {
    return this.prismaService.level5.update({
      where: {
        id: data.id
      },
      data: {
        isLeaf: data.isLeaf,
        count: data.count,
        location: data.location,
        name: data.name,
        url: data.url,
        keyword: data.keyword,
        hash: data.hash,
        qm: data.qm,
        audience: data.audience,
        mtime: data.mtime,
        viewCount: data.viewCount
      },
    })
  }

  @Mutation((returns) => Level5)
  deleteLevel5(
    @Args('id') id: string
  ) {
    return this.prismaService.level5.delete({
      where: {
        id: id
      }
    })
  }
  //   @ResolveField('contents', () => [Content])
  //   async getTopic(@Root() topics: Topic) {
  //     return this.prismaService.content.findMany({
  //       where: {
  //         pid: topics.id
  //       }
  //     });
  //   }

  //   @ResolveField('classes', () => [Classification])
  //   async getParent(@Root() topic: Topic) {
  //     return this.prismaService.classification
  //     .findMany({
  //       where: {
  //         id: topic.pid,
  //       },
  //     })
  //   }


  //   @Query(() => Topic, { name: 'topics' })
  //   async getTopics(@Args('id', { type: () => String }) id: string) {
  //     return this.prismaService.topic.findMany(
  //       {
  //         where: {
  //           id: id
  //         }
  //       }
  //       );
  //     }

  //     @Query((returns) => [Topic])
  //     getVideoTopics(
  //       @Args('searchVideoTopics', { nullable: true }) searchVideoTopics: string,
  //       @Args('skip', { nullable: true }) skip: number,
  //       @Args('take', { nullable: true }) take: number,
  //       @Context() ctx) {

  //         const or = searchVideoTopics
  //         ? {
  //           OR: [
  //             { name: { contains: searchVideoTopics } }
  //           ],
  //         }
  //         : {}

  //         return this.prismaService.topic.findMany({
  //           where: {
  //             foldertype: { contains: 'video' },
  //             ...or,
  //           },
  //       take: take || undefined,
  //       skip: skip || undefined,
  //     })
  //   }



















  //   // import { PostCreateInput } from './resolvers.post'

  //   // @InputType()
  //   // class UserUniqueInput {
  //   //   @Field({ nullable: true })
  //   //   id: number

  //   //   @Field({ nullable: true })
  //   //   email: string
  //   // }

  //   // @InputType()
  //   // class UserCreateInput {
  //   //   @Field()
  //   //   email: string

  //   //   @Field({ nullable: true })
  //   //   name: string

  //   //   @Field((type) => [PostCreateInput], { nullable: true })
  //   //   posts: [PostCreateInput]
  //   // }


  //   // @ResolveField()
  //   // async posts(@Root() user: User, @Context() ctx): Promise<Post[]> {
  //   //   return this.prismaService.user
  //   //     .findUnique({
  //   //       where: {
  //   //         id: user.id,
  //   //       },
  //   //     })
  //   //     .posts()
  //   // }

  //   // @Mutation((returns) => User)
  //   // async signupUser(
  //   //   @Args('data') data: UserCreateInput,
  //   //   @Context() ctx,
  //   // ): Promise<User> {
  //   //   const postData = data.posts?.map((post) => {
  //   //     return { title: post.title, content: post.content || undefined }
  //   //   })

  //   //   return this.prismaService.user.create({
  //   //     data: {
  //   //       email: data.email,
  //   //       name: data.name,
  //   //       posts: {
  //   //         create: postData
  //   //       }
  //   //     },
  //   //   })
  //   // }

  //   // @Query((returns) => User, { nullable: true })
  //   // async allUsers(@Context() ctx) {
  //   //   return this.prismaService.user.findMany()
  //   // }

  //   // @Query((returns) => [Post], { nullable: true })
  //   // async draftsByUser(@Args('userUniqueInput') userUniqueInput: UserUniqueInput): Promise<Post[]> {
  //   //   return this.prismaService.user.findUnique({
  //   //     where: {
  //   //       id: userUniqueInput.id || undefined,
  //   //       email: userUniqueInput.email || undefined
  //   //     }
  //   //   }).posts({
  //   //     where: {
  //   //       published: false
  //   //     }
  //   //   })
  //   // }
}
