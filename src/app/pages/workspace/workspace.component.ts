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


type UserState =
  | 'calm'
  | 'moderate'
  | 'stressed';


type BoxColor =
  | 'red'
  | 'green'
  | 'blue';


interface RobotStateConfig {
  label: string;
  message: string;
  color: string;
}


interface UserStateConfig {
  label: string;
  description: string;
  speedMultiplier: number;
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
   * ROBOT STATES
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


  readonly currentConfig = computed(() => {
    return this.states[this.currentState()];
  });


  /*
   * =====================================
   * USER STATES
   * =====================================
   *
   * Manual selection only.
   * No biosensing or machine learning.
   */

  readonly userStates: Record<UserState, UserStateConfig> = {

    calm: {
      label: 'Calm',
      description: 'Normal feedback and normal task speed',
      speedMultiplier: 1
    },

    moderate: {
      label: 'Moderate',
      description: 'Clearer highlighting and simpler feedback',
      speedMultiplier: 1
    },

    stressed: {
      label: 'Stressed',
      description: 'Simplified feedback and slower task execution',
      speedMultiplier: 1.5
    }

  };


  readonly currentUserState =
    signal<UserState>('calm');


  readonly currentUserConfig = computed(() => {
    return this.userStates[this.currentUserState()];
  });


  /*
   * =====================================
   * STATUS MESSAGE
   * =====================================
   */

  readonly statusMessage =
    signal(
      'Choose a stacking order and start the task'
    );


  /*
   * =====================================
   * ADAPTIVE XR VISUAL EMPHASIS
   * =====================================
   */

  readonly xrStatusScale = computed(() => {

    switch (this.currentUserState()) {

      case 'moderate':
        return '1.06 1.06 1.06';

      case 'stressed':
        return '1.12 1.12 1.12';

      default:
        return '1 1 1';

    }

  });


  readonly xrStatusRadius = computed(() => {

    switch (this.currentUserState()) {

      case 'moderate':
        return 0.12;

      case 'stressed':
        return 0.15;

      default:
        return 0.09;

    }

  });


  /*
   * =====================================
   * ROBOT MOTION / ACTIVITY
   * =====================================
   *
   * Separate from RobotState.
   *
   * 0   = idle / stationary
   * 100 = high motion
   *
   * The left-side colormap uses this.
   */

  readonly robotActivityLevel =
    signal(5);


  readonly robotActivityLabel = computed(() => {

    const level =
      this.robotActivityLevel();


    if (level >= 80) {
      return 'High motion';
    }


    if (level >= 50) {
      return 'Active';
    }


    if (level >= 20) {
      return 'Low motion';
    }


    return 'Idle';

  });


  /*
   * Keeps the visual marker inside
   * the gradient container.
   */

  readonly robotActivityMarkerPosition = computed(() => {

    return Math.min(
      97,
      Math.max(
        3,
        this.robotActivityLevel()
      )
    );

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


  readonly boxPositions =
    signal<Record<BoxColor, string>>({

      red:
        this.boxes.red.startPosition,

      green:
        this.boxes.green.startPosition,

      blue:
        this.boxes.blue.startPosition

    });


  /*
   * =====================================
   * STACK ORDER
   * =====================================
   *
   * index 0 = bottom
   * index 1 = middle
   * index 2 = top
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


  readonly progressText = computed(() => {

    return `${this.completedBoxes().length} / 3`;

  });


  /*
   * =====================================
   * ROBOT JOINTS
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
   * Approximate symbolic pickup poses.
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
   * USER STATE SELECTION
   * =====================================
   */

  setUserState(
    state: UserState
  ): void {

    /*
     * Keep adaptation fixed while a task
     * is running.
     */

    if (this.isRunning()) {
      return;
    }


    this.currentUserState.set(state);


    switch (state) {

      case 'calm':

        this.statusMessage.set(
          'Normal feedback enabled'
        );

        break;


      case 'moderate':

        this.statusMessage.set(
          'Clearer feedback enabled'
        );

        break;


      case 'stressed':

        this.statusMessage.set(
          'Simplified feedback enabled. Task motion will be slower.'
        );

        break;

    }

  }


  /*
   * =====================================
   * MANUAL ROBOT STATE TESTING
   * =====================================
   */

  setState(
    state: RobotState
  ): void {

    if (this.isRunning()) {
      return;
    }


    this.currentState.set(state);


    /*
     * Update the motion visualization.
     *
     * Note:
     * an error does not automatically mean
     * that the robot is physically moving.
     */

    switch (state) {

      case 'idle':

        this.robotActivityLevel.set(5);

        this.setAdaptiveMessage(
          'Ready for a command',
          'Ready for the next task',
          'Ready'
        );

        break;


      case 'working':

        this.robotActivityLevel.set(70);

        this.setAdaptiveMessage(
          'Robot is performing a task',
          'Task in progress',
          'Working safely'
        );

        break;


      case 'waiting':

        this.robotActivityLevel.set(10);

        this.setAdaptiveMessage(
          'Waiting for user action',
          'Waiting for your input',
          'Waiting for you'
        );

        break;


      case 'error':

        this.robotActivityLevel.set(5);

        this.setAdaptiveMessage(
          'Attention is required',
          'Task stopped. Please check the system.',
          'Task paused. Please check when ready.'
        );

        break;

    }

  }


  /*
   * =====================================
   * CHANGE STACK ORDER
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


    const existingIndex =
      currentOrder.indexOf(newColor);


    /*
     * Swap instead of allowing duplicate
     * colors.
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


    this.currentState.set(
      'waiting'
    );


    this.robotActivityLevel.set(5);


    this.setAdaptiveMessage(
      'Stacking order updated. Press Start Stacking.',
      'Order updated. Press Start.',
      'Order ready. Press Start.'
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
       * =================================
       * PREPARE
       * =================================
       */

      this.currentState.set(
        'working'
      );


      this.robotActivityLevel.set(25);


      this.setAdaptiveMessage(
        'Preparing the workspace',
        'Preparing task',
        'Preparing...'
      );


      this.resetBoxPositions();

      this.moveRobotHome();

      this.gripperClosed.set(false);


      await this.taskDelay(900);


      /*
       * =================================
       * STACK EACH BOX
       * =================================
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
       * =================================
       * RETURN HOME
       * =================================
       */

      this.currentBox.set(null);


      this.robotActivityLevel.set(85);


      this.setAdaptiveMessage(
        'Returning to home position',
        'Returning home',
        'Finishing task'
      );


      this.moveRobotHome();


      await this.taskDelay(1100);


      /*
       * =================================
       * COMPLETE
       * =================================
       */

      this.currentState.set(
        'idle'
      );


      this.robotActivityLevel.set(5);


      this.setAdaptiveMessage(
        'Stacking task completed successfully',
        'Stacking complete',
        'Task complete'
      );

    }
    catch (error) {

      console.error(error);


      this.currentState.set(
        'error'
      );


      /*
       * Error and motion are intentionally
       * separate concepts.
       */

      this.robotActivityLevel.set(5);


      this.setAdaptiveMessage(
        'The stacking task could not be completed',
        'Task stopped. Please check the system.',
        'Task paused. Please check when ready.'
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
     * =================================
     * STEP 1
     * MOVE TOWARD BOX
     * =================================
     */

    this.currentState.set(
      'working'
    );


    this.robotActivityLevel.set(90);


    this.setAdaptiveMessage(

      `Moving toward the ${box.label.toLowerCase()} box`,

      `Moving to ${box.label.toLowerCase()} box`,

      'Moving to box'

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


    await this.taskDelay(1000);


    /*
     * =================================
     * STEP 2
     * GRASP
     * =================================
     */

    this.robotActivityLevel.set(45);


    this.setAdaptiveMessage(

      `Grasping the ${box.label.toLowerCase()} box`,

      `Picking up ${box.label.toLowerCase()}`,

      'Picking up box'

    );


    this.gripperClosed.set(true);


    await this.taskDelay(450);


    /*
     * =================================
     * STEP 3
     * LIFT
     * =================================
     */

    this.robotActivityLevel.set(85);


    this.setAdaptiveMessage(

      `Lifting the ${box.label.toLowerCase()} box`,

      `Lifting ${box.label.toLowerCase()} box`,

      'Lifting box'

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


    await this.taskDelay(900);


    /*
     * =================================
     * STEP 4
     * TRANSPORT
     * =================================
     */

    this.robotActivityLevel.set(100);


    this.setAdaptiveMessage(

      `Moving ${box.label.toLowerCase()} box to stack level ${level + 1}`,

      `Moving ${box.label.toLowerCase()} to level ${level + 1}`,

      'Moving box'

    );


    const hoverHeight =
      1.62 +
      (level * this.boxHeight);


    this.setBoxPosition(
      color,
      this.stackX,
      hoverHeight,
      this.stackZ
    );


    this.shoulderRotation.set(
      '0 0 10'
    );


    this.elbowRotation.set(
      '0 0 -115'
    );


    this.wristRotation.set(
      '0 0 -50'
    );


    await this.taskDelay(1000);


    /*
     * =================================
     * STEP 5
     * PLACE
     * =================================
     */

    this.robotActivityLevel.set(75);


    this.setAdaptiveMessage(

      `Placing the ${box.label.toLowerCase()} box`,

      `Placing ${box.label.toLowerCase()} box`,

      'Placing box'

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


    await this.taskDelay(800);


    /*
     * =================================
     * STEP 6
     * RELEASE
     * =================================
     */

    this.robotActivityLevel.set(30);


    this.setAdaptiveMessage(

      `Releasing the ${box.label.toLowerCase()} box`,

      `Releasing ${box.label.toLowerCase()} box`,

      'Box placed'

    );


    this.gripperClosed.set(false);


    await this.taskDelay(400);


    /*
     * =================================
     * STEP 7
     * MOVE AWAY
     * =================================
     */

    this.robotActivityLevel.set(80);


    this.setAdaptiveMessage(

      `${box.label} box placed at level ${level + 1}`,

      `${box.label} placed`,

      'Step complete'

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


    await this.taskDelay(700);

  }


  /*
   * =====================================
   * RESET TASK
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


    this.currentState.set(
      'idle'
    );


    this.robotActivityLevel.set(5);


    this.setAdaptiveMessage(

      'Choose a stacking order and start the task',

      'Choose the order, then press Start',

      'Choose an order and press Start'

    );

  }


  /*
   * =====================================
   * ADAPTIVE MESSAGE HELPER
   * =====================================
   */

  private setAdaptiveMessage(
    calm: string,
    moderate: string,
    stressed: string
  ): void {

    switch (this.currentUserState()) {

      case 'moderate':

        this.statusMessage.set(
          moderate
        );

        break;


      case 'stressed':

        this.statusMessage.set(
          stressed
        );

        break;


      default:

        this.statusMessage.set(
          calm
        );

    }

  }


  /*
   * =====================================
   * ADAPTIVE TASK SPEED
   * =====================================
   */

  private taskDelay(
    milliseconds: number
  ): Promise<void> {

    const multiplier =
      this.currentUserConfig()
        .speedMultiplier;


    const adaptedDelay =
      Math.round(
        milliseconds * multiplier
      );


    return this.delay(
      adaptedDelay
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

    const duration =
      Math.round(
        750 *
        this.currentUserConfig()
          .speedMultiplier
      );


    return `
      property: position;
      to: ${this.boxPositions()[color]};
      dur: ${duration};
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
   * BASIC DELAY
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