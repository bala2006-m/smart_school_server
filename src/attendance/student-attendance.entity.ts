import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'StudentAttendance' })
export class StudentAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  school_id: string;

  @Column()
  class_id: string;

  @Column()
  date: string;


}
