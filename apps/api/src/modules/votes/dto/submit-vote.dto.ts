import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class SubmitVoteDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  selectedOptionIds: string[];
}
