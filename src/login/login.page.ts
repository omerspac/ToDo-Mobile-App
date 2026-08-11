import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Preferences } from '@capacitor/preferences';

import {
  IonContent,
  IonInput,
  IonButton,
  IonText,
  IonIcon
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  lockClosedOutline,
  mailOutline,
  checkmarkDoneOutline
} from 'ionicons/icons';

const LOGIN_KEY = 'todo_app_logged_in';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonInput,
    IonButton,
    IonText,
    IonIcon
  ]
})
export class LoginPage implements OnInit {

  email = '';
  password = '';
  errorMessage = '';

  private readonly validEmail = 'admin@example.com';
  private readonly validPassword = 'Admin123';

  constructor(private router: Router) {
    addIcons({
      mailOutline,
      lockClosedOutline,
      checkmarkDoneOutline
    });
  }

  async ngOnInit() {
    const { value } = await Preferences.get({
      key: LOGIN_KEY
    });

    if (value === 'true') {
      await this.router.navigate(['/home'], {
        replaceUrl: true
      });
    }
  }

  async login() {
    this.errorMessage = '';

    if (!this.email || !this.password) {
      this.errorMessage =
        'Please enter your email and password.';
      return;
    }

    if (
      this.email.trim() !== this.validEmail ||
      this.password !== this.validPassword
    ) {
      this.errorMessage =
        'Invalid email or password.';
      return;
    }

    // Remember that the user is logged in.
    await Preferences.set({
      key: LOGIN_KEY,
      value: 'true'
    });

    await this.router.navigate(['/home'], {
      replaceUrl: true
    });
  }
}