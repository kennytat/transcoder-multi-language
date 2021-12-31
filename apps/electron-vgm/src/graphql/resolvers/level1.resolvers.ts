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
} from '@nestjs/graphql'
import { Inject } from '@nestjs/common'
import { PrismaService } from '../prisma.service'

import { Root as Home } from '../models/root.model'
import { Level1 } from '../models/level1.model'
import { Level2 } from '../models/level2.model'

@Resolver(Level1)
export class Level1Resolver {
  constructor(@Inject(PrismaService) private prismaService: PrismaService) { }

  @Query(() => Level1, { name: 'level1Unique' })
  async getSelf(@Args('id', { type: () => String }) id: string) {
    return this.prismaService.level1.findUnique({
      where: {
        id: id
      }
    });
  }

  @Query((returns) => [Level1])
  level1Queries(
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
    return this.prismaService.level1.findMany({
      where: {
        isVideo: isVideo,
        isLeaf: isLeaf,
        id: id
      },
    })
  }

  @ResolveField('parent', () => [Home])
  async getParent(@Root() level1: Level1) {
    return this.prismaService.root.findUnique({
      where: {
        id: level1.pid,
      },
    })
  }

  @ResolveField('children', () => [Level2])
  async getChildren(@Root() level1: Level1) {
    return this.prismaService.level2.findMany({
      where: {
        pid: level1.id
      }
    });
  }
















  //     // @Query(() => Category, { name: 'categories' })
  //     // async getCategories(@Args('id', { type: () => String }) id: string) {
  //       //   return this.prismaService.category.findMany(
  //         //     {
  //           //       where: {
  //             //         id: id
  //             //       }
  //             //     }
  //             //     );
  //             // }

  //     // import { ClassificationCreateInput } from './classification.resolvers'
  //     // import { ClassificationResolver } from './classification.resolvers'


  //     // @InputType()
  //     // class CategoryUniqueInput {
  //     //   @Field({ nullable: true })
  //     //   id: string

  //     //   @Field({ nullable: true })
  //     //   name: string
  //     // }

  //     // @InputType()
  //     // class CategoryCreateInput {
  //     //   @Field()
  //     //   name: string

  //     //   @Field({ nullable: true })
  //     //   qm: string

  //     //   @Field({ nullable: true })
  //     //   qm: string

  //     //   @Field({ nullable: true })
  //     //   duration: number

  //     //   @Field({ nullable: true })
  //     //   size: number

  //     //   @Field()
  //     //   thumb: string

  //     //   @Field()
  //     //   isvideo: boolean
  //     // }

  //   // @ResolveField('classification', returns => [Classfication])
  //   // async categories(@Root() media: Media) {
  //   //   const { id } = media;
  //   //   return this.prismaService.media.findUnique({
  //   //     where: {
  //   //       id: id
  //   //     }
  //   //   });
  //   // }


  //   // @ResolveField()
  //   // async posts(@Root() content: Content, @Context() ctx): Promise<Post[]> {
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
