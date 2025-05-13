import { ApiProperty } from '@nestjs/swagger';

export class SignUpDTO {
  @ApiProperty({ description: 'email'})
  email?: string;

  @ApiProperty({ description: '用户名'})
  username?: string;

  @ApiProperty({ description: '密码'})
  password: string;

  @ApiProperty({ description: '用户组'})
  userGroup?: string;

  @ApiProperty({ description: '头像', required: false })
  avatar?: string;
}

export class SignInDTO {
  @ApiProperty({ description: 'email'})
  email: string;

  @ApiProperty({ description: '用户名'})
  username: string;

  @ApiProperty({ description: '密码'})
  password: string;
}
