import { cyan, green } from "kleur/colors";
import { log } from "../../common/logging";

/**
 * Stops the timer for the given build step and prints the execution time.
 * @param {string} stepName Name of the action, like 'Compiled' or 'Minified'
 * @param {string} targetName Name of the target, like a filename or path
 * @param {DOMHighResTimeStamp} startTime Start time of build step
 */
 export function endBuildStep(stepName: string, targetName: string, startTime: DOMHighResTimeStamp) {
  const endTime = Date.now();
  const executionTime = new Date(endTime - startTime);
  const mins = executionTime.getMinutes();
  const secs = executionTime.getSeconds();
  const ms = ('000' + executionTime.getMilliseconds().toString()).slice(-3);
  let timeString = '(';
  if (mins > 0) {
    timeString += `${mins} m ${secs}.${ms} s)`;
  } else if (secs === 0) {
    timeString += `${ms} ms)`;
  } else {
    timeString += `${secs}.${ms} s)`;
  }
  log(stepName, cyan(targetName), green(timeString));
}
