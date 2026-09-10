import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  computed,
  signal
} from '@angular/core';

import { RouterLink } from '@angular/router';
import { CobotComponent } from '../../components/cobot/cobot.component';


type RobotState =
  | 'idle'
  | 'working'
  | 'waiting'
  | 'error';


type BoxColor =
  | 'red'
  | 'green'
  | 'blue';


interface RobotStateConfig {
  label: string;
  message: string;
  color: string;
}


interface BoxConfig {
  label: string;
  color: string;
  startPosition: string;
}


interface RobotPose {
  shoulder: string;
  elbow: string;
  wrist: string;
}


@Component({
  selector: 'app-workspace',
  standalone: true,

  imports: [
    RouterLink,
    CobotComponent
  ],

  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',

  schemas: [
    CUSTOM_ELEMENTS_SCHEMA
  ]
})
export class WorkspaceComponent {

  /*
   * =====================================
   * SYSTEM STATES
   * =====================================
   */

  readonly states: Record<RobotState, RobotStateConfig> = {

    idle: {
      label: 'Idle',
      message: 'Ready for a command',
      color: '#4C78A8'
    },

    working: {
      label: 'Working',
      message: 'Robot is performing a task',
      color: '#3A9D5D'
    },

    waiting: {
      label: 'Waiting',
      message: 'Waiting for user action',
      color: '#D6A32A'
    },

    error: {
      label: 'Error',
      message: 'Attention is required',
      color: '#C94747'
    }

  };


  readonly currentState =
    signal<RobotState>('idle');


  readonly statusMessage =
    signal('Choose a stacking order and start the task');


  readonly currentConfig = computed(() => {
    return this.states[this.currentState()];
  });


  /*
   * =====================================
   * BOX CONFIGURATION
   * =====================================
   */

  readonly boxes: Record<BoxColor, BoxConfig> = {

    red: {
      label: 'Red',
      color: '#D94A4A',
      startPosition: '0.60 1.20 -3'
    },

    green: {
      label: 'Green',
      color: '#3A9D5D',
      startPosition: '0.95 1.20 -3'
    },

    blue: {
      label: 'Blue',
      color: '#4C78A8',
      startPosition: '1.30 1.20 -3'
    }

  };


  /*
   * Current physical positions.
   */

  readonly boxPositions =
    signal<Record<BoxColor, string>>({

      red: this.boxes.red.startPosition,

      green: this.boxes.green.startPosition,

      blue: this.boxes.blue.startPosition

    });


  /*
   * =====================================
   * STACK ORDER
   *
   * index 0 = bottom
   * index 1 = middle
   * index 2 = top
   * =====================================
   */

  readonly stackOrder =
    signal<BoxColor[]>([
      'blue',
      'red',
      'green'
    ]);


  /*
   * =====================================
   * STACK TARGET
   * =====================================
   */

  readonly stackX = 0.15;

  readonly stackZ = -3;

  /*
   * Table surface is about y = 1.06.
   * Box height is 0.28.
   */
  readonly stackBaseY = 1.20;

  readonly boxHeight = 0.28;


  /*
   * =====================================
   * TASK INFORMATION
   * =====================================
   */

  readonly isRunning =
    signal(false);


  readonly completedBoxes =
    signal<BoxColor[]>([]);


  readonly currentBox =
    signal<BoxColor | null>(null);


  /*
   * =====================================
   * ROBOT
   * =====================================
   */

  readonly shoulderRotation =
    signal('0 0 -10');


  readonly elbowRotation =
    signal('0 0 -55');


  readonly wristRotation =
    signal('0 0 65');


  readonly gripperClosed =
    signal(false);


  /*
   * Different approximate pickup poses.
   *
   * These are symbolic poses.
   * We are not doing inverse kinematics yet.
   */

  readonly pickupPoses:
    Record<BoxColor, RobotPose> = {

      red: {
        shoulder: '0 0 -50',
        elbow: '0 0 -60',
        wrist: '0 0 35'
      },

      green: {
        shoulder: '0 0 -60',
        elbow: '0 0 -50',
        wrist: '0 0 30'
      },

      blue: {
        shoulder: '0 0 -70',
        elbow: '0 0 -40',
        wrist: '0 0 25'
      }

    };


  /*
   * =====================================
   * PROGRESS
   * =====================================
   */

  readonly progressText = computed(() => {

    return `${this.completedBoxes().length} / 3`;

  });


  /*
   * =====================================
   * MANUAL STATE
   * =====================================
   */

  setState(state: RobotState): void {

    if (this.isRunning()) {
      return;
    }

    this.currentState.set(state);

    this.statusMessage.set(
      this.states[state].message
    );

  }


  /*
   * =====================================
   * USER CHANGES STACKING ORDER
   * =====================================
   */

  changeOrder(
    index: number,
    event: Event
  ): void {

    if (this.isRunning()) {
      return;
    }


    const select =
      event.target as HTMLSelectElement;


    const newColor =
      select.value as BoxColor;


    const currentOrder = [
      ...this.stackOrder()
    ];


    /*
     * Find where the newly-selected
     * color already exists.
     */

    const existingIndex =
      currentOrder.indexOf(newColor);


    /*
     * Swap instead of allowing duplicates.
     *
     * Example:
     *
     * Blue Red Green
     *
     * User changes Bottom to Red
     *
     * becomes:
     *
     * Red Blue Green
     */

    if (
      existingIndex !== -1 &&
      existingIndex !== index
    ) {

      const oldColor =
        currentOrder[index];

      currentOrder[existingIndex] =
        oldColor;

    }


    currentOrder[index] =
      newColor;


    this.stackOrder.set(
      currentOrder
    );


    this.currentState.set('waiting');

    this.statusMessage.set(
      'Stacking order updated. Press Start Stacking.'
    );

  }


  /*
   * =====================================
   * MAIN STACKING TASK
   * =====================================
   */

  async runStackingTask(): Promise<void> {

    if (this.isRunning()) {
      return;
    }


    this.isRunning.set(true);

    this.completedBoxes.set([]);

    this.currentBox.set(null);


    try {

      /*
       * RESET EVERYTHING FIRST
       */

      this.currentState.set('working');

      this.statusMessage.set(
        'Preparing the workspace'
      );


      this.resetBoxPositions();

      this.moveRobotHome();

      this.gripperClosed.set(false);


      await this.delay(900);


      /*
       * STACK EACH BOX
       */

      const order =
        this.stackOrder();


      for (
        let level = 0;
        level < order.length;
        level++
      ) {

        const boxColor =
          order[level];


        await this.pickAndPlaceBox(
          boxColor,
          level
        );


        this.completedBoxes.update(
          completed => [
            ...completed,
            boxColor
          ]
        );

      }


      /*
       * RETURN HOME
       */

      this.currentBox.set(null);

      this.statusMessage.set(
        'Returning to home position'
      );

      this.moveRobotHome();

      await this.delay(1100);


      /*
       * TASK COMPLETE
       */

      this.currentState.set('idle');

      this.statusMessage.set(
        'Stacking task completed successfully'
      );

    }
    catch (error) {

      console.error(error);

      this.currentState.set('error');

      this.statusMessage.set(
        'The stacking task could not be completed'
      );

    }
    finally {

      this.isRunning.set(false);

      this.currentBox.set(null);

      this.gripperClosed.set(false);

    }

  }


  /*
   * =====================================
   * PICK AND PLACE ONE BOX
   * =====================================
   */

  private async pickAndPlaceBox(
    color: BoxColor,
    level: number
  ): Promise<void> {

    this.currentBox.set(color);

    const box =
      this.boxes[color];


    const pose =
      this.pickupPoses[color];


    /*
     * -------------------------------------
     * STEP 1
     * MOVE TOWARD BOX
     * -------------------------------------
     */

    this.currentState.set('working');

    this.statusMessage.set(
      `Moving toward the ${box.label.toLowerCase()} box`
    );


    this.shoulderRotation.set(
      pose.shoulder
    );

    this.elbowRotation.set(
      pose.elbow
    );

    this.wristRotation.set(
      pose.wrist
    );


    await this.delay(1000);


    /*
     * -------------------------------------
     * STEP 2
     * CLOSE GRIPPER
     * -------------------------------------
     */

    this.statusMessage.set(
      `Grasping the ${box.label.toLowerCase()} box`
    );


    this.gripperClosed.set(true);


    await this.delay(450);


    /*
     * -------------------------------------
     * STEP 3
     * LIFT BOX
     * -------------------------------------
     */

    this.statusMessage.set(
      `Lifting the ${box.label.toLowerCase()} box`
    );


    const start =
      this.parsePosition(
        this.boxPositions()[color]
      );


    this.setBoxPosition(
      color,
      start.x,
      1.62,
      start.z
    );


    this.shoulderRotation.set(
      '0 0 -40'
    );

    this.elbowRotation.set(
      '0 0 -65'
    );

    this.wristRotation.set(
      '0 0 45'
    );


    await this.delay(900);


    /*
     * -------------------------------------
     * STEP 4
     * MOVE ABOVE STACK TARGET
     * -------------------------------------
     */

    this.statusMessage.set(
      `Moving ${box.label.toLowerCase()} box to stack level ${level + 1}`
    );


    const hoverHeight =
      1.62 + (level * this.boxHeight);


    this.setBoxPosition(
      color,
      this.stackX,
      hoverHeight,
      this.stackZ
    );


    /*
     * Approximate placing pose.
     */

    this.shoulderRotation.set(
      '0 0 10'
    );

    this.elbowRotation.set(
      '0 0 -115'
    );

    this.wristRotation.set(
      '0 0 -50'
    );


    await this.delay(1000);


    /*
     * -------------------------------------
     * STEP 5
     * LOWER BOX
     * -------------------------------------
     */

    this.statusMessage.set(
      `Placing the ${box.label.toLowerCase()} box`
    );


    const targetY =
      this.stackBaseY +
      (level * this.boxHeight);


    this.setBoxPosition(
      color,
      this.stackX,
      targetY,
      this.stackZ
    );


    this.elbowRotation.set(
      '0 0 -130'
    );


    await this.delay(800);


    /*
     * -------------------------------------
     * STEP 6
     * RELEASE
     * -------------------------------------
     */

    this.statusMessage.set(
      `Releasing the ${box.label.toLowerCase()} box`
    );


    this.gripperClosed.set(false);


    await this.delay(400);


    /*
     * -------------------------------------
     * STEP 7
     * MOVE AWAY
     * -------------------------------------
     */

    this.statusMessage.set(
      `${box.label} box placed at level ${level + 1}`
    );


    this.shoulderRotation.set(
      '0 0 -20'
    );

    this.elbowRotation.set(
      '0 0 -70'
    );

    this.wristRotation.set(
      '0 0 45'
    );


    await this.delay(700);

  }


  /*
   * =====================================
   * RESET
   * =====================================
   */

  resetTask(): void {

    if (this.isRunning()) {
      return;
    }


    this.resetBoxPositions();

    this.stackOrder.set([
      'blue',
      'red',
      'green'
    ]);


    this.completedBoxes.set([]);

    this.currentBox.set(null);

    this.gripperClosed.set(false);

    this.moveRobotHome();


    this.currentState.set('idle');

    this.statusMessage.set(
      'Choose a stacking order and start the task'
    );

  }


  /*
   * =====================================
   * BOX ANIMATION
   * =====================================
   */

  getBoxAnimation(
    color: BoxColor
  ): string {

    return `
      property: position;
      to: ${this.boxPositions()[color]};
      dur: 750;
      easing: easeInOutQuad
    `;

  }


  /*
   * =====================================
   * BOX HELPERS
   * =====================================
   */

  private setBoxPosition(
    color: BoxColor,
    x: number,
    y: number,
    z: number
  ): void {

    this.boxPositions.update(
      positions => ({

        ...positions,

        [color]:
          `${x} ${y} ${z}`

      })
    );

  }


  private resetBoxPositions(): void {

    this.boxPositions.set({

      red:
        this.boxes.red.startPosition,

      green:
        this.boxes.green.startPosition,

      blue:
        this.boxes.blue.startPosition

    });

  }


  private parsePosition(
    position: string
  ): {
    x: number;
    y: number;
    z: number;
  } {

    const values =
      position
        .split(' ')
        .map(Number);


    return {
      x: values[0],
      y: values[1],
      z: values[2]
    };

  }


  /*
   * =====================================
   * ROBOT HOME
   * =====================================
   */

  private moveRobotHome(): void {

    this.shoulderRotation.set(
      '0 0 -10'
    );

    this.elbowRotation.set(
      '0 0 -55'
    );

    this.wristRotation.set(
      '0 0 65'
    );

  }


  /*
   * =====================================
   * DELAY
   * =====================================
   */

  private delay(
    milliseconds: number
  ): Promise<void> {

    return new Promise(resolve => {

      setTimeout(
        resolve,
        milliseconds
      );

    });

  }

}