<template>
    <v-card outlined class="mx-auto d-inline-block" min-width="600">
      <v-card-title>Benutzer*innenprofil</v-card-title>
      <v-card-subtitle>Deine Accountinformationen für die {{ $store.state.config.title }} Plattform </v-card-subtitle>
      <v-divider />
      <v-card-text>
        <v-list>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>face</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.cn  }}</v-list-item-title><v-list-item-subtitle>Anzeigename</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>person</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.uid  }}</v-list-item-title><v-list-item-subtitle>User ID</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>home</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.title  }}</v-list-item-title><v-list-item-subtitle>Zugehörigkeit</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>home</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.l  }}</v-list-item-title><v-list-item-subtitle>Ort</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>email</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.mail  }}</v-list-item-title><v-list-item-subtitle>E-Mail Adresse</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>language</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.preferredLanguage || "de" }}</v-list-item-title><v-list-item-subtitle>Sprache</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
          <v-list-item>
            <v-list-item-icon>
              <v-icon>upload</v-icon>
            </v-list-item-icon>
            <v-list-item-content><v-list-item-title>{{ $store.state.user.description  }}</v-list-item-title><v-list-item-subtitle>Speicherplatz</v-list-item-subtitle></v-list-item-content>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn color="info" to="/profile/edit" aria-label="Profil bearbeiten" data-microtip-position="top-left" role="tooltip"><v-icon>edit</v-icon></v-btn>
        <v-btn color="info" aria-label="Passwort ändern" data-microtip-position="top-left" role="tooltip"><v-icon>key</v-icon></v-btn>
      </v-card-actions>
    </v-card>
</template>

<script>
import axios from 'axios'
import router from '../../router'
export default {
  name: 'Profile',
  data () {
    return {}
  },
}
</script>
