import 'reflect-metadata'
import { ObjectType, Field, Int } from '@nestjs/graphql'
import { Level1 } from './level1.model'

@ObjectType()
export class Root {
  @Field((type) => String)
  id: string

  @Field((type) => Int)
  dblevel: number

  @Field((type) => Date)
  createdAt: Date

  @Field((type) => Date)
  updatedAt: Date

  @Field((type) => String)
  name: string

  @Field((type) => [Level1], { nullable: true })
  children?: [Level1] | null
}

