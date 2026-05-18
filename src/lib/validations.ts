export const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
export const passwordMessage = "Password must be atleast 8 characters include one uppercase,number,symbol";

export const emailRegex =  /^\S+@\S+\.\S+$/;
export const emailMessage = "Please use a valid email"; 