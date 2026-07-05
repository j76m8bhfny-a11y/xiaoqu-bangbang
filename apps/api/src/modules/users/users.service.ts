import { Injectable, Inject, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(PrismaService) private prisma: PrismaService) {}

  async getMySkills(userId: string) {
    return this.prisma.userSkill.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSkill(userId: string, dto: CreateSkillDto) {
    return this.prisma.userSkill.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        images: dto.images ?? [],
      },
    });
  }

  async updateSkill(userId: string, skillId: string, dto: UpdateSkillDto) {
    const skill = await this.prisma.userSkill.findFirst({
      where: { id: skillId, deletedAt: null },
    });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }
    if (skill.userId !== userId) {
      throw new ForbiddenException('无权修改他人技能');
    }
    return this.prisma.userSkill.update({
      where: { id: skillId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.images !== undefined && { images: dto.images }),
      },
    });
  }

  async deleteSkill(userId: string, skillId: string) {
    const skill = await this.prisma.userSkill.findFirst({
      where: { id: skillId, deletedAt: null },
    });
    if (!skill) {
      throw new NotFoundException('技能不存在');
    }
    if (skill.userId !== userId) {
      throw new ForbiddenException('无权删除他人技能');
    }
    await this.prisma.userSkill.update({
      where: { id: skillId },
      data: { deletedAt: new Date() },
    });
  }
}
