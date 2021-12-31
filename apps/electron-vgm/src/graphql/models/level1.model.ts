import 'reflect-metadata'
import { ObjectType, Field, Int } from '@nestjs/graphql'
import { Root } from './root.model'
import { Level2 } from './level2.model'

@ObjectType()
export class Level1 {
  @Field((type) => String)
  id: string

  @Field((type) => String)
  pid: string

  @Field((type) => Int)
  dblevel: number

  @Field((type) => Date)
  createdAt: Date

  @Field((type) => Date)
  updatedAt: Date

  @Field((type) => String)
  location: string

  @Field((type) => Boolean, { nullable: true })
  isLeaf: boolean

  @Field((type) => String)
  url: string

  @Field((type) => Boolean)
  isVideo: boolean

  @Field((type) => String)
  name: string

  @Field((type) => Int)
  count: number

  @Field((type) => [Root])
  parent: [Root]

  @Field((type) => [Level2], { nullable: true })
  children?: [Level2] | null
}