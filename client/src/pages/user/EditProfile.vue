<template>

  <v-card outlined class="mx-auto d-inline-block" min-width="600">
    <v-card-title>Account bearbeiten</v-card-title>
    <v-card-subtitle>Ändere deine Accountinformationen </v-card-subtitle>
    <v-divider />
    <v-card-text>
        <UserForm :user="user" @valid="valid => { this.valid = valid}" action="editProfile" />
    </v-card-text>
    <v-divider />
    <v-card-actions>
      <v-btn
        text
        @click="$router.go(-1)"
        aria-label="Zurück" data-microtip-position="top-right" role="tooltip"
      >
        <v-icon>arrow_back</v-icon>
      </v-btn>
      <v-spacer />
      <v-btn

        :disabled="!valid"
        color="success"
        @click="save"
        aria-label="Speichern" data-microtip-position="top-left" role="tooltip"
      >
        <v-icon>save</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>
import UserForm from '@/components/user/UserForm'

export default {
  components: { UserForm },
  data() {
    return {
      user: {},
      valid: true
    }
  },
  methods: {
    save: function () {
      axios.post('/api/user/profile', this.user)
        .then(response => {
          this.$store.state.config.authenticated = true
          this.$store.state.user = response.data.user
          this.$snackbar.success('Profil gespeichert')
          router.push('/profile')
        })
        .catch(errors => {
          //this.$snackbar.error('Profil konnte nicht gespeichert werden: ' + errors)
          console.log('error at saving profile: ', errors)
        })
    }
  },
  created() {
    this.user = { ...this.$store.state.user }
  }
}
</script>