<template>

  <v-card outlined style="display: flex; flex-direction:column" width="100%" height="100%" min-height="700">
    <v-card-title>Einladung senden</v-card-title>
    <v-card-subtitle>Verschicke eine Einladung zur Erstellung eines Accounts</v-card-subtitle>
    <v-divider />
    <v-card-text>
      <v-form
        ref="form"
        v-model="valid"
        lazy-validation>
        <v-text-field
          prepend-icon="email"
          :rules="[v => /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v) || 'keine gültige E-Mailadresse' ]"
          v-model="email"
          label="E-Mail"
          >
        </v-text-field>
      </v-form>
    </v-card-text>
    <v-divider />
      <v-toolbar flat>
        <v-toolbar-title>Gruppenauswahl</v-toolbar-title>
        <v-spacer></v-spacer>
        <v-text-field
            prepend-icon="search"
            label="Suchen..."
            v-model="search"
            single-line
            hide-details
            dense
          />
      </v-toolbar>
    <v-card-text style="height:100%;overflow: hidden;">
      <GroupTable v-if="groupsLoaded" :groups="groups" :search="search" :flat="!$store.state.user.isAdmin" @selectGroup="onSelectGroup" @renderedAndSized="onRenderedAndSized" rowSelection="multiple"/>
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
        aria-label="Einladung senden" data-microtip-position="top-left" role="tooltip"
      >
        <v-icon>send</v-icon>
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script>

import axios from 'axios'
import router from '@/router'
import GroupTable from '@/components/group/GroupTable'
export default {
  components: {GroupTable},
  data() {
    return {
      valid: false,
      groups: [],
      selectedGroups: [],
      groupsLoaded: false,
      email: '',
      search: '',
      languages: [{text: 'Deutsch', value: 'de'}, {text: 'English', value: 'en'}],
      renderedAndSized: false
    }
  },
  methods: {
    onSelectGroup: function(selectedRows) {
      this.selectedGroups = selectedRows;
    },
    onRenderedAndSized: function(renderedAndSized) {
      this.renderedAndSized = renderedAndSized;
    },
    save: function () {
      var self = this;
      axios.post('/api/user/invite', {email: this.email, groups: this.selectedGroups.map(group => {return group.dn})})
        .then(response => {
          console.log('response', response);
          this.$snackbar.success('Einladung an ' + self.email + ' verschickt')
          router.push('/invites')
        })
        .catch(error => {
          console.log('error', error);
        })
    },
    getGroups: function () {
      var self = this;
      axios.get('/api/groups')
        .then(response => {
          self.groups = response.data.groups;
          self.groupsLoaded = true;
        });
    }
  },
  created() {
    this.getGroups();
  }
}
</script>