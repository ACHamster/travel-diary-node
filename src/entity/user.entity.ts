import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { UserGroup } from './usergroup.entity';

@Entity('user')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({unique: true})
  email: string;

  @Column({unique: true})
  username: string;

  @Column()
  password: string;

  @Column({ nullable:true })
  avatar?: string;

  @ManyToOne(() => UserGroup, userGroup => userGroup.users)
  userGroup: UserGroup;

  @Column({ nullable: true })
  userGroupId: number;
}
