<template>
  <v-card outlined class="mx-auto d-inline-block" min-width="600">
    <v-card-title>Login</v-card-title>
    <v-divider />
    <v-card-text>
      <v-form id="login-form" v-on:submit="login">
        <v-text-field
          prepend-icon="person"
          name="username"
          label="Login"
          id="username"
          type="text"
        ></v-text-field>
        <v-text-field
          prepend-icon="lock"
          name="password"
          label="Password"
          id="password"
          type="password"
        ></v-text-field>
      </v-form>
    </v-card-text>
    <v-divider />
    <v-card-actions>
      <v-spacer />
      <v-btn
        form="login-form"
        type="submit"
        color="success"
        class="mr-4"
      >Login</v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import router from '../router'
import axios from 'axios'
export default {
  name: 'Login',
  data () {
    return {
      config: {}
    }
  },
  methods: {
    login: function (e) {
      e.preventDefault()
      let username = e.target.elements.username.value
      let password = e.target.elements.password.value
      let login = () => {
        let data = {
          username: username,
          password: password
        }
        axios.post('/api/login', data)
          .then(response => {
            this.$store.state.config.authenticated = true
            this.$store.state.user = response.data.user
            this.$snackbar.success('Eingeloggt als ' + response.data.user.cn)
            if (this.$route.query.returnTo) {
              router.replace(this.$route.query.returnTo)
            } else {
              router.replace({name: 'Profile'})
            }
          })
          .catch((errors) => {
            console.log('Cannot log in', errors)
          })
      }
      login()
    },
    checkLoggedIn: function () {
      if (this.$store.state.config.authenticated) {
        router.push('/profile')
      }
    }
  },
  created () {
    this.checkLoggedIn()
  }
}
</script>
