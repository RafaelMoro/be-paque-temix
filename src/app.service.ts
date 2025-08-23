import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Example, ExampleDoc } from './example.entity';
import { CreateVideogameDto } from './example.dto';

@Injectable()
export class AppService {
  constructor(
    @InjectModel(Example.name) private exampleModel: Model<Example>,
  ) {}

  async findExamples(): Promise<ExampleDoc[]> {
    try {
      const examples: ExampleDoc[] = await this.exampleModel.find().exec();
      if (!examples) {
        return [];
      }
      return examples;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }

  async createExample(data: CreateVideogameDto): Promise<ExampleDoc> {
    try {
      const model = new this.exampleModel(data);
      const modelSaved: ExampleDoc = await model.save();
      return modelSaved;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException('An unknown error occurred');
    }
  }
}
