import {AbstractControl, FormControl, FormGroupDirective, NgForm, ValidationErrors, ValidatorFn} from "@angular/forms";
import {ErrorStateMatcher} from "@angular/material/core";

/**
 * Custom ErrorStateMatcher to show errors immediately when a control is dirty and invalid,
 * instead of waiting for it to be touched (blurred).
 */
export class ImmediateErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !!(control && control.invalid && (control.dirty || control.touched));
  }
}

/**
 * Custom validator to check if passwords match.
 */
export function passwordMatchValidator(): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const password = formGroup.get('password')?.value;
    const confirmPassword = formGroup.get('confirmPassword')?.value;

    // If the main password hasn't been filled out, there's nothing to compare.
    // The 'required' validator on the other field will handle it if necessary.
    if (!password && !confirmPassword) {
      return null;
    }

    // Returns an error if passwords don't match.
    return password === confirmPassword ? null : { passwordMismatch: true };
  };
}

/**
 * Custom validator to check if the number of hours does not exceed the maximum allowed.
 * @param max The maximum number of hours allowed.
 */
export function maxHoursValidator(max: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control.value === null || control.value === undefined) {
      return null;
    }
    const hours = parseFloat(control.value);
    if (isNaN(hours) || hours <= 0) {
      return null; // Let the 'min' validator handle this
    }
    if (hours > max) {
      return {maxHoursExceeded: {max: max, actual: hours}};
    }
    return null;
  };
}