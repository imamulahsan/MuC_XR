import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Input
} from '@angular/core';


@Component({
  selector: '[appCobot]',

  standalone: true,

  imports: [],

  templateUrl: './cobot.component.html',

  styleUrl: './cobot.component.scss',

  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class CobotComponent {

  /*
   * State feedback color.
   *
   * Idle    -> Blue
   * Working -> Green
   * Waiting -> Yellow
   * Error   -> Red
   */
  @Input()
  stateColor = '#4C78A8';


  /*
   * Robot joint targets.
   */
  @Input()
  shoulderRotation = '0 0 -10';


  @Input()
  elbowRotation = '0 0 -55';


  @Input()
  wristRotation = '0 0 65';


  /*
   * Gripper state.
   */
  @Input()
  gripperClosed = false;


  /*
   * ================================
   * GRIPPER POSITIONS
   * ================================
   */

  get leftFingerPosition(): string {

    if (this.gripperClosed) {

      return '-0.055 0.14 0';

    }

    return '-0.11 0.14 0';

  }


  get rightFingerPosition(): string {

    if (this.gripperClosed) {

      return '0.055 0.14 0';

    }

    return '0.11 0.14 0';

  }

}