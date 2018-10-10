import external from '../../externalModules.js';
import { toolType } from './definitions.js';
import createNewMeasurement from './createNewMeasurement.js';
import updatePerpendicularLineHandles from './updatePerpendicularLineHandles.js';
import moveNewHandleTouch from '../../manipulators/moveNewHandleTouch.js';
import anyHandlesOutsideImage from '../../manipulators/anyHandlesOutsideImage.js';
import { addToolState, removeToolState } from '../../stateManagement/toolState.js';

export default function (touchEventData) {
  const element = { touchEventData };

  // LT-29 Disable Target Measurements when pixel spacing is not available
  if (!touchEventData.image.rowPixelSpacing || !touchEventData.image.columnPixelSpacing) {
    return;
  }

  const doneCallback = () => {
    measurementData.active = false;
    external.cornerstone.updateImage(element);
  };

  const measurementData = createNewMeasurement(touchEventData);
  const { cancelled, handles } = measurementData;
  const config = cornerstoneTools[toolType].getConfiguration();

  // Associate this data with this imageId so we can render it and manipulate it
  addToolState(element, toolType, measurementData);

  // Since we are dragging to another place to drop the end point, we can just activate
  // The end point and let the moveHandle move it for us.
  const { touchMoveHandle, tapCallback, touchDownActivateCallback } = cornerstoneTools[toolType];

  element.removeEventListener('cornerstonetoolstouchdrag', touchMoveHandle);
  element.removeEventListener('cornerstonetoolstap', tapCallback);
  element.removeEventListener('cornerstonetoolsdragstartactive', touchDownActivateCallback);

  // Update the perpendicular line handles position
  const updateHandler = (event) => updatePerpendicularLineHandles(event.detail, measurementData);

  element.addEventListener('cornerstonetoolstouchdrag', updateHandler);
  element.addEventListener('cornerstonetoolstouchend', updateHandler);

  external.cornerstone.updateImage(element);
  const { end, perpendicularStart } = handles;

  moveNewHandleTouch(touchEventData, toolType, measurementData, end, () => {
    if (cancelled || anyHandlesOutsideImage(touchEventData, handles)) {
      // Delete the measurement
      removeToolState(element, toolType, measurementData);
    } else {
      // Set lesionMeasurementData Session
      config.getMeasurementLocationCallback(measurementData, touchEventData, doneCallback);
    }

    // Perpendicular line is not connected to long-line
    perpendicularStart.locked = false;

    // Unbind the handlers to update perpendicular line
    element.removeEventListener('cornerstonetoolstouchdrag', updateHandler);
    element.removeEventListener('cornerstonetoolstouchend', updateHandler);

    element.addEventListener('cornerstonetoolstouchdrag', touchMoveHandle);
    element.addEventListener('cornerstonetoolstap', tapCallback);
    element.addEventListener('cornerstonetoolsdragstartactive', touchDownActivateCallback);
    external.cornerstone.updateImage(element);
  });
}
